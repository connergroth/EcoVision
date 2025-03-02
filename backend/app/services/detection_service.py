# Modify: backend/app/services/detection_service.py

import numpy as np
import cv2
from typing import List, Optional, Tuple
import tensorflow as tf
import logging
from io import BytesIO
from PIL import Image
import torch
import torch.nn as nn
import onnxruntime

from app.models import Detection, RecyclableCategory, BoundingBox
from app.config import settings
from app.services.npu_service import is_npu_available, get_npu_delegate
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Define Distribution Focal Loss (needed for post-processing)
class DFL(nn.Module):
    def __init__(self, c1=16):
        super().__init__()
        self.conv = nn.Conv2d(c1, 1, 1, bias=False).requires_grad_(False)
        x = torch.arange(c1, dtype=torch.float)
        self.conv.weight.data[:] = nn.Parameter(x.view(1, c1, 1, 1))
        self.c1 = c1

    def forward(self, x):
        b, c, a = x.shape  # batch, channels, anchors
        return self.conv(x.view(b, 4, self.c1, a).transpose(2, 1).softmax(1)).view(b, 4, a)

# Convert distance format to bounding box
def dist2bbox(distance, anchor_points, xywh=True, dim=-1):
    lt, rb = torch.split(distance, 2, dim)
    x1y1 = anchor_points - lt
    x2y2 = anchor_points + rb
    if xywh:
        c_xy = (x1y1 + x2y2) / 2
        wh = x2y2 - x1y1
        return torch.cat((c_xy, wh), dim)
    return torch.cat((x1y1, x2y2), dim)

# Load model once at module initialization
try:
    MODEL = None
    LABELS = ['plastic', 'metal', 'paper', 'glass', 'organic', 'other']
    INPUT_SIZE = (640, 640)  # Default YOLOv8 input size
    
    def load_model():
        global MODEL, LABELS
        
        # Path to your custom trained model
        model_path = settings.MODEL_PATH
        if not model_path or not os.path.exists(model_path):
            # Try default path
            model_path = 'backend/data/models/yolov8m_recycling.onnx'
            if not os.path.exists(model_path):
                model_path = 'backend/data/models/yolov8m.onnx'
                
        # Check if NPU acceleration is available and enabled
        if settings.ENABLE_NPU and is_npu_available():
            logger.info(f"Loading model with NPU acceleration: {model_path}")
            
            # Initialize ONNX session with NPU provider
            providers = ['VitisAIExecutionProvider']
            provider_options = [{'config_file': settings.NPU_CONFIG_PATH}]
            
            session_options = onnxruntime.SessionOptions()
            MODEL = onnxruntime.InferenceSession(
                model_path,
                providers=providers,
                sess_options=session_options,
                provider_options=provider_options
            )
        else:
            logger.info(f"Loading model with CPU: {model_path}")
            # Use ONNX Runtime with CPU provider
            providers = ['CPUExecutionProvider']
            MODEL = onnxruntime.InferenceSession(model_path, providers=providers)
        
        # Use predefined recyclable categories
        LABELS = [c.value for c in RecyclableCategory]
        logger.info(f"Using category labels: {LABELS}")
    
    # Load model at module initialization
    load_model()
    
except Exception as e:
    logger.error(f"Error loading model: {e}")
    MODEL = None
    LABELS = []

def process_image(image_data: bytes, resize_for_streaming: bool = False) -> np.ndarray:
    """
    Process raw image data into the format needed by the model.
    
    Args:
        image_data: Raw image bytes
        resize_for_streaming: If True, resize image to a smaller size for faster processing
    
    Returns:
        Processed image as numpy array
    """
    try:
        # Convert bytes to image
        image = Image.open(BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize image
        if resize_for_streaming:
            # Use smaller size for streaming for faster processing
            target_size = (320, 320)
        else:
            # Use model's expected input size
            target_size = INPUT_SIZE
        
        image = image.resize(target_size)
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Normalize pixel values to 0-1
        img_array = img_array / 255.0
        
        # Rearrange dimensions for ONNX input (NHWC -> NCHW for some models)
        # Check the model's expected input format
        if MODEL and hasattr(MODEL, 'get_inputs') and len(MODEL.get_inputs()) > 0:
            input_shape = MODEL.get_inputs()[0].shape
            # If input is NCHW (channels first)
            if len(input_shape) == 4 and input_shape[1] == 3:
                img_array = np.transpose(img_array, (2, 0, 1))  # HWC -> CHW
        
        # Add batch dimension if needed
        if len(img_array.shape) == 3:
            img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise ValueError(f"Failed to process image: {e}")

def post_process(outputs):
    """
    Post-process the model outputs to get detections in a standard format.
    This handles direct outputs from our custom trained YOLOv8 model.
    
    Args:
        outputs: Raw model outputs
        
    Returns:
        List of processed detections
    """
    try:
        # The number of classes in the model
        num_classes = len(LABELS)  # 6 recycling categories
        
        # Handle different output formats
        if isinstance(outputs, list) and len(outputs) > 0:
            # Multiple output tensors - typical for YOLOv8 ONNX models
            # First tensor contains the detection results
            detection_output = outputs[0]
        else:
            # Single output tensor
            detection_output = outputs
        
        # Process the detection output
        # YOLOv8 ONNX output format: [batch, num_detections, 4+num_classes]
        # Where 4 is for bounding box coordinates (x, y, w, h) and num_classes is the number of class probabilities
        
        # Threshold for confidence
        conf_threshold = 0.25
        
        # List to store final detections
        detections = []
        
        # Process each detection
        for i in range(detection_output.shape[1]):
            # Get confidence (objectness * class_prob)
            confidence = float(np.max(detection_output[0, i, 4:]))
            
            # Skip low confidence detections
            if confidence < conf_threshold:
                continue
            
            # Get class with highest probability
            class_id = int(np.argmax(detection_output[0, i, 4:]))
            
            # Get bounding box coordinates - normalized
            x, y, w, h = detection_output[0, i, :4]
            
            # Convert to RecyclableCategory
            if class_id < len(LABELS):
                try:
                    category = RecyclableCategory(LABELS[class_id])
                except ValueError:
                    category = RecyclableCategory.UNKNOWN
            else:
                category = RecyclableCategory.UNKNOWN
            
            # Create bounding box
            bbox = BoundingBox(
                x_min=float(x - w/2),
                y_min=float(y - h/2),
                x_max=float(x + w/2),
                y_max=float(y + h/2)
            )
            
            # Add detection
            detections.append(Detection(
                category=category,
                confidence=confidence,
                bounding_box=bbox
            ))
        
        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x.confidence, reverse=True)
        
        return detections
        
    except Exception as e:
        logger.error(f"Error in post-processing: {e}")
        return []

def detect_objects(image: np.ndarray, optimized_for_streaming: bool = False) -> List[Detection]:
    """
    Run object detection on a processed image.
    
    Args:
        image: Processed image as numpy array
        optimized_for_streaming: If True, use faster but potentially less accurate detection
    
    Returns:
        List of Detection objects with category, confidence, and bounding box
    """
    if MODEL is None:
        raise ValueError("Model not loaded. Please initialize the model first.")
    
    try:
        # Get the input tensor name from the model
        input_name = MODEL.get_inputs()[0].name
        
        # Prepare input in the correct format for the model
        # For ONNX models, check the expected input shape
        input_shape = MODEL.get_inputs()[0].shape
        
        # Reshape input if needed
        if len(input_shape) == 4:
            # Check if model expects batch dimension
            if input_shape[0] == 1 or input_shape[0] == -1:
                # Check channel order (NCHW vs NHWC)
                if input_shape[1] == 3:  # NCHW
                    if image.shape[1] != 3 and image.shape[3] == 3:
                        # Convert from NHWC to NCHW if needed
                        image = np.transpose(image, (0, 3, 1, 2))
                else:  # NHWC
                    if image.shape[1] == 3 and image.shape[3] != 3:
                        # Convert from NCHW to NHWC if needed
                        image = np.transpose(image, (0, 2, 3, 1))
        
        # Run inference
        outputs = MODEL.run(None, {input_name: image.astype(np.float32)})
        
        # Post-process outputs to get detections
        detections = post_process(outputs)
        
        return detections
    
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise ValueError(f"Failed to run detection: {e}")