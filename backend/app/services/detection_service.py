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
    
    Args:
        outputs: Raw model outputs from ONNX model
        
    Returns:
        List of Detection objects
    """
    try:
        # Determine output format (single array or multiple arrays)
        if isinstance(outputs, list):
            if len(outputs) > 1:
                # Multiple output format (boxes, scores, classes)
                boxes = outputs[0]
                scores = outputs[1]
                class_ids = outputs[2].astype(np.int32)
                
                # Create detections list
                detections = []
                
                # Confidence threshold
                conf_threshold = 0.25
                
                # Process each detection
                for i in range(boxes.shape[1]):
                    if scores[0, i] >= conf_threshold:
                        # Get class id and score
                        class_id = int(class_ids[0, i])
                        confidence = float(scores[0, i])
                        
                        # Get box coordinates
                        x1, y1, x2, y2 = boxes[0, i, :]
                        
                        # Convert to normalized coordinates if needed
                        # (depends on your model's output format)
                        
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
                            x_min=float(x1),
                            y_min=float(y1),
                            x_max=float(x2),
                            y_max=float(y2)
                        )
                        
                        # Add detection
                        detections.append(Detection(
                            category=category,
                            confidence=confidence,
                            bounding_box=bbox
                        ))
            else:
                # Single output array but in a list
                detection_output = outputs[0]
        else:
            # Single output array
            detection_output = outputs
            
        # If we have a single detection output (most common for YOLOv8)
        if 'detection_output' in locals():
            # Number of classes in your model
            num_classes = len(LABELS)
            
            # Confidence threshold
            conf_threshold = 0.25
            
            # List to store final detections
            detections = []
            
            # Process each detection
            for i in range(detection_output.shape[1]):
                # Get confidence (highest class probability)
                class_scores = detection_output[0, i, 4:4+num_classes]
                confidence = float(np.max(class_scores))
                
                # Skip low confidence detections
                if confidence < conf_threshold:
                    continue
                
                # Get class with highest probability
                class_id = int(np.argmax(class_scores))
                
                # Get bounding box coordinates
                # YOLOv8 typically outputs [x_center, y_center, width, height]
                cx, cy, w, h = detection_output[0, i, :4]
                
                # Convert to corner coordinates
                x1 = cx - w/2
                y1 = cy - h/2
                x2 = cx + w/2
                y2 = cy + h/2
                
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
                    x_min=float(x1),
                    y_min=float(y1),
                    x_max=float(x2),
                    y_max=float(y2)
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
    # ... existing code ...
    
    # Run inference
    outputs = MODEL.run(None, {input_name: image.astype(np.float32)})
    
    # Debug: Print output information
    logger.info(f"Output type: {type(outputs)}")
    if isinstance(outputs, list):
        for i, out in enumerate(outputs):
            logger.info(f"Output[{i}] shape: {out.shape}, dtype: {out.dtype}")
            logger.info(f"Output[{i}] sample values: {out.flatten()[:10]}")
    else:
        logger.info(f"Output shape: {outputs.shape}, dtype: {outputs.dtype}")
        logger.info(f"Output sample values: {outputs.flatten()[:10]}")
    
    # Post-process outputs to get detections
    detections = post_process(outputs)
    
    return detections