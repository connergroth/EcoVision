import onnxruntime as ort
from PIL import Image
import numpy as np
import base64
import io
import os
import uuid

def predict_image(image_path_or_bytes):
    # Load the ONNX model
    model_path = "best1.onnx"
    session = ort.InferenceSession(model_path)
    
    # Load and preprocess image
    if isinstance(image_path_or_bytes, str):
        image = Image.open(image_path_or_bytes)
    else:
        image = Image.open(io.BytesIO(image_path_or_bytes))
    
    # Preprocess image
    input_size = (416, 416)
    image_resized = image.resize(input_size)
    img_array = np.array(image_resized) / 255.0
    img_array = img_array.transpose(2, 0, 1)
    img_array = img_array[np.newaxis, ...]
    
    # Run inference
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: img_array.astype(np.float32)})
    
    # Process predictions
    predictions = []
    class_names = ["plastic", "metal", "glass"]
    
    # Get the output tensor (shape: 1, 7, 3549)
    output = outputs[0][0]  # Remove batch dimension
    
    # First 4 rows contain bbox coordinates
    bbox_predictions = output[:4, :]  # Shape: (4, 3549)
    # Remaining rows contain class probabilities
    class_predictions = output[4:, :]  # Shape: (3, 3549)
    
    # Find detections with high confidence
    confidence_threshold = 0.5
    class_confidences = np.max(class_predictions, axis=0)  # Max confidence per detection
    high_confidence_detections = class_confidences > confidence_threshold
    
    # Process each high confidence detection
    for i in range(len(high_confidence_detections)):
        if high_confidence_detections[i]:
            # Get bounding box coordinates
            bbox = bbox_predictions[:, i]
            confidence = class_confidences[i]
            class_id = np.argmax(class_predictions[:, i])
            
            # Convert to pixel coordinates
            orig_width, orig_height = image.size
            x_pixel = float(bbox[0]) * orig_width
            y_pixel = float(bbox[1]) * orig_height
            width_pixel = float(bbox[2]) * orig_width
            height_pixel = float(bbox[3]) * orig_height
            
            predictions.append({
                "x": x_pixel,
                "y": y_pixel,
                "width": width_pixel,
                "height": height_pixel,
                "confidence": float(confidence),
                "class": class_names[class_id] if class_id < len(class_names) else "unknown",
                "class_id": int(class_id),
                "detection_id": str(uuid.uuid4())
            })
    
    return {"predictions": predictions}

# Test the function
result = predict_image("new.jpeg")
print(result)



