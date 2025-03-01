import numpy as np
import cv2
from typing import List, Optional, Tuple
import tensorflow as tf
import logging
from io import BytesIO
from PIL import Image

from app.models import Detection, RecyclableCategory, BoundingBox
from app.config import settings
from app.services.npu_service import is_npu_available, get_npu_delegate
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Load model once at module initialization
try:
    MODEL = None
    LABELS = []
    INPUT_SIZE = (416, 416)  # Default input size, adjust based on your model
    
    def load_model():
        global MODEL, LABELS
        
        # Check if NPU acceleration is available and enabled
        if settings.ENABLE_NPU and is_npu_available():
            logger.info("Loading model with NPU acceleration")
            # Initialize TFLite interpreter with NPU delegate
            interpreter = tf.lite.Interpreter(
                model_path=settings.MODEL_PATH,
                experimental_delegates=[get_npu_delegate()]
            )
            interpreter.allocate_tensors()
            MODEL = interpreter
        else:
            logger.info("Loading model with CPU")
            # For TF SavedModel format
            MODEL = tf.saved_model.load(settings.MODEL_PATH)
        
        # Load labels for the model
        try:
            labels_path = settings.MODEL_PATH.replace('.pb', '.txt').replace('.tflite', '.txt')
            with open(labels_path, 'r') as f:
                LABELS = [line.strip() for line in f.readlines()]
            logger.info(f"Loaded {len(LABELS)} labels: {LABELS}")
        except Exception as e:
            logger.warning(f"Could not load labels file: {e}")
            # Define default recyclable categories if labels file is not found
            LABELS = [c.value for c in RecyclableCategory]
            logger.info(f"Using default labels: {LABELS}")
    
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
        
        # Normalize pixel values if needed (depends on model requirements)
        img_array = img_array / 255.0
        
        # Add batch dimension if needed
        if len(img_array.shape) == 3:
            img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise ValueError(f"Failed to process image: {e}")

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
        # Run inference based on model type
        if isinstance(MODEL, tf.lite.Interpreter):
            # TFLite model inference
            detections = _detect_with_tflite(MODEL, image, optimized_for_streaming)
        else:
            # SavedModel inference
            detections = _detect_with_saved_model(MODEL, image, optimized_for_streaming)
        
        return detections
    
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise ValueError(f"Failed to run detection: {e}")

def _detect_with_saved_model(model, image: np.ndarray, optimized: bool) -> List[Detection]:
    """Run detection with a TF SavedModel"""
    # Ensure image has the right format
    if image.shape[0] == 1:
        # Remove batch dimension for inference
        image_tensor = tf.convert_to_tensor(image[0])
    else:
        image_tensor = tf.convert_to_tensor(image)
    
    # Run inference (assuming model follows standard detection API)
    # Adjust based on your specific model's signature
    detections = model(image_tensor)
    
    # Process model-specific outputs into a standard format
    # This will vary based on your model architecture
    detection_boxes = detections['detection_boxes'].numpy()
    detection_scores = detections['detection_scores'].numpy()
    detection_classes = detections['detection_classes'].numpy().astype(np.int32)
    
    # Convert detections to our Detection model format
    results = []
    
    for i in range(len(detection_scores)):
        confidence = float(detection_scores[i])
        
        # Skip low confidence detections
        if confidence < 0.1:  # Minimum threshold to consider
            continue
            
        # Map class index to category
        class_idx = detection_classes[i]
        if 0 <= class_idx < len(LABELS):
            try:
                category = RecyclableCategory(LABELS[class_idx])
            except ValueError:
                # If the label doesn't match our RecyclableCategory enum
                category = RecyclableCategory.UNKNOWN
        else:
            category = RecyclableCategory.UNKNOWN
        
        # Create bounding box
        ymin, xmin, ymax, xmax = detection_boxes[i]
        bbox = BoundingBox(
            x_min=float(xmin),
            y_min=float(ymin),
            x_max=float(xmax),
            y_max=float(ymax)
        )
        
        # Create Detection object
        results.append(Detection(
            category=category,
            confidence=confidence,
            bounding_box=bbox
        ))
    
    # Sort by confidence (highest first)
    results.sort(key=lambda x: x.confidence, reverse=True)
    
    return results

def _detect_with_tflite(interpreter, image: np.ndarray, optimized: bool) -> List[Detection]:
    """Run detection with TFLite interpreter"""
    # Get input details
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Set input tensor
    interpreter.set_tensor(input_details[0]['index'], image)
    
    # Run inference
    interpreter.invoke()
    
    # Get detection results
    # The output tensor format depends on your specific TFLite model
    # This is based on common object detection models like SSD, YOLO
    
    # For YOLO-based models (like SeegulL):
    try:
        # Get output tensors (adjust indices based on your model)
        boxes = interpreter.get_tensor(output_details[0]['index'])
        scores = interpreter.get_tensor(output_details[1]['index'])
        classes = interpreter.get_tensor(output_details[2]['index']).astype(np.int32)
        num_detections = int(interpreter.get_tensor(output_details[3]['index']))
        
        # Convert to standard format
        results = []
        
        for i in range(min(num_detections, len(scores))):
            if scores[i] < 0.1:  # Minimum threshold
                continue
                
            # Map class index to category
            class_idx = classes[i]
            if 0 <= class_idx < len(LABELS):
                try:
                    category = RecyclableCategory(LABELS[class_idx])
                except ValueError:
                    category = RecyclableCategory.UNKNOWN
            else:
                category = RecyclableCategory.UNKNOWN
            
            # Create bounding box
            ymin, xmin, ymax, xmax = boxes[i]
            bbox = BoundingBox(
                x_min=float(xmin),
                y_min=float(ymin),
                x_max=float(xmax),
                y_max=float(ymax)
            )
            
            # Create Detection object
            results.append(Detection(
                category=category,
                confidence=float(scores[i]),
                bounding_box=bbox
            ))
        
        # Sort by confidence
        results.sort(key=lambda x: x.confidence, reverse=True)
        
        return results
        
    except Exception as e:
        logger.error(f"Error processing TFLite output: {e}")
        return []