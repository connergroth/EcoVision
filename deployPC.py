import cv2
import numpy as np
from ultralytics import YOLO
import time
import threading
import os
import matplotlib.pyplot as plt
import onnxruntime
import torch
import torch.nn.functional as F
import torchvision  # Added missing import for non_max_suppression


def setup_npu_session(onnx_model_path, config_file_path):
    # Create session options
    npu_options = onnxruntime.SessionOptions()
    
    # Set graph optimization level
    npu_options.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
    
    # Force to use the VitisAIExecutionProvider only - no fallbacks
    providers = ['VitisAIExecutionProvider']
    provider_options = [{'config_file': config_file_path}]
    
    # Check available providers
    available_providers = onnxruntime.get_available_providers()
    print(f"Available ONNX Runtime providers: {available_providers}")
    
    if 'VitisAIExecutionProvider' not in available_providers:
        raise RuntimeError("VitisAIExecutionProvider is not available in the system")
    
    # Create the ONNX Runtime session with Vitis AI provider only
    try:
        # Explicitly disable CPU provider by only listing VitisAIExecutionProvider
        npu_session = onnxruntime.InferenceSession(
            onnx_model_path,
            sess_options=npu_options,
            providers=providers,
            provider_options=provider_options
        )
    except Exception as e:
        print(f"Failed to create NPU session: {e}")
        raise
    
    # Verify the active provider is VitisAIExecutionProvider
    active_providers = npu_session.get_providers()
    print(f"Active providers: {active_providers}")
    
    if 'VitisAIExecutionProvider' not in active_providers:
        raise RuntimeError("VitisAIExecutionProvider is not being used")
        
    print("Successfully initialized NPU session using VitisAIExecutionProvider")
    
    return npu_session

# Global variables
returnlist = []
trashlist = [0, 0, 0, 0, 0]
count = 0
classes = ['cardboard/paper', 'glass', 'metal', 'plastic', 'trash']
running = True
detected_items = set()  # Set to keep track of detected items

# Define thresholds for excluding heads (adjust these values as needed)
MIN_HEAD_WIDTH = 50
MIN_HEAD_HEIGHT = 50
MAX_HEAD_WIDTH = 200
MAX_HEAD_HEIGHT = 200

def is_head(box):
    """
    Determine if a bounding box is likely to be a head based on its size.
    
    Args:
        box: Bounding box coordinates (x1, y1, x2, y2)
    
    Returns:
        True if the box is likely to be a head, False otherwise.
    """
    x1, y1, x2, y2 = box
    width = x2 - x1
    height = y2 - y1
    return MIN_HEAD_WIDTH <= width <= MAX_HEAD_WIDTH and MIN_HEAD_HEIGHT <= height <= MAX_HEAD_HEIGHT

def save_detection(frame, box, label, conf):
    """
    Save the detected object as a JPEG file.
    
    Args:
        frame: The original frame.
        box: Bounding box coordinates (x1, y1, x2, y2).
        label: The class label of the detected object.
        conf: The confidence score of the detection.
    """
    x1, y1, x2, y2 = box
    detected_object = frame[y1:y2, x1:x2]
    filename = f"{label}_{conf:.2f}.jpg"
    filepath = os.path.join("detections", filename)
    os.makedirs("detections", exist_ok=True)
    cv2.imwrite(filepath, detected_object)
    print(f"Saved detection: {filepath}")

def frame_process(frame, input_shape=(416, 416)):
    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, input_shape)
    img = torch.from_numpy(img)
    img = img.float()  # uint8 to fp16/32
    img /= 255  # 0 - 255 to 0.0 - 1.0
    img = np.transpose(img, (2, 0, 1))
    return img

def post_process(outputs):
    """
    Post-process the outputs from the model to get bounding boxes and class scores.
    
    Args:
        outputs: Raw outputs from the model.
    
    Returns:
        Processed outputs with bounding boxes and class scores.
    """
    # The ONNX model output shape is different - reshape it to expected format
    processed_outputs = []
    
    # Debug the tensor shapes
    for i, output in enumerate(outputs):
        print(f"Processing output {i} with shape {output.shape}")
        
        # For a tensor of shape [1, 7, 3549], we need to reshape
        if output.shape[1] == 7 and len(output.shape) == 3:
            # The output shape is [batch, 7, n_detections]
            # Reshape to [n_detections, 7] format
            reshaped_output = output[0].transpose(0, 1)  # Now shape is [n_detections, 7]
            print(f"Reshaped to {reshaped_output.shape}")
            
            # Get bbox coordinates (first 4 elements) and class scores (last 2 elements)
            # Assuming format is [x, y, w, h, confidence, class1_score, class2_score, etc.]
            bbox_coords = reshaped_output[:, :4]
            confidence = reshaped_output[:, 4:5]  # Keep as a 2D tensor
            class_scores = reshaped_output[:, 5:]
            
            # Concatenate in the format expected by non_max_suppression
            processed_output = torch.cat((bbox_coords, confidence, class_scores), dim=1)
            processed_outputs.append(processed_output)
            
    return processed_outputs

def non_max_suppression(preds, conf_thres=0.25, iou_thres=0.45, agnostic=False, max_det=300, classes=None):
    """
    Apply non-max suppression to filter out overlapping bounding boxes.
    
    Args:
        preds: List of predictions from the model.
        conf_thres: Confidence threshold.
        iou_thres: IoU threshold for non-max suppression.
        agnostic: Whether to perform class-agnostic NMS.
        max_det: Maximum number of detections per image.
        classes: List of class indices to keep.
    
    Returns:
        Filtered predictions after applying non-max suppression.
    """
    # Initialize list to store final predictions
    final_preds = []

    for pred in preds:
        # Filter out predictions with low confidence
        conf_mask = pred[:, 4] > conf_thres
        pred = pred[conf_mask]

        if not pred.size(0):
            continue

        # Get bounding boxes and scores
        boxes = pred[:, :4]
        scores = pred[:, 4]
        class_scores = pred[:, 5:]

        # Perform non-max suppression
        keep = torchvision.ops.nms(boxes, scores, iou_thres)
        if keep.size(0) > max_det:
            keep = keep[:max_det]

        # Append filtered predictions to final list
        final_preds.append(pred[keep])

    return final_preds

def trashfunc():
    """
    Detect and classify waste objects using YOLOv8
    
    Returns:
        List of class detection counts
    """
    global count, trashlist, running, detected_items
    
    # Reset global variables
    trashlist = [0, 0, 0, 0, 0]
    count = 0
    running = True
    detected_items.clear()  # Clear the set of detected items
    
    # Set environment variables for Vitis AI NPU
    os.environ["XLNX_ENABLE_NPU_STANDALONE"] = "1"
    os.environ["XLNX_VART_TRACE"] = "1"  # Enable verbose logging
    
    print("Environment variables set for NPU acceleration")
    
    # Load pre-trained YOLOv8 model
    try:
        # Use the custom trained model
        model = YOLO('model\\best1.pt')
    except Exception as e:
        print(f"Error loading model: {e}")
        return trashlist
    
    # Setup NPU session
    onnx_model_path = "model\\best1.onnx"
    config_file_path = "./vaip_config.json"
    
    # Create Vitis AI config file if it doesn't exist
    if not os.path.exists(config_file_path):
        print(f"Creating Vitis AI config file: {config_file_path}")
        vitis_config = {
            "target": "DPUCAHX8H",  # Adjust based on your actual NPU model
            "npu_core_num": 2,
            "npu_memory_policy": "HIGHEST_PERFORMANCE",
            "npu_batch_size": 1,
            "npu_thread_num": 4
        }
        with open(config_file_path, 'w') as f:
            import json
            json.dump(vitis_config, f, indent=2)
            
    npu_session = setup_npu_session(onnx_model_path, config_file_path)
    
    # Confirm we're using the NPU
    print("NPU session created. Input name:", npu_session.get_inputs()[0].name)
    print("Using NPU providers:", npu_session.get_providers())
    
    # Open video capture
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera")
        return trashlist
    
    # Generate random colors for classes
    colors = np.random.uniform(0, 255, size=(len(classes), 3))
    
    # Set higher frame rate and adjust capture properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    plt.ion()  # Turn on interactive mode
    fig, ax = plt.subplots()
    
    while running:
        # Read frame
        ret, frame = cap.read()
        
        if ret:
            # Display original frame using matplotlib
            ax.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            plt.draw()
            plt.pause(0.001)
            ax.clear()
            
            try:
                # Preprocess frame
                input_shape = (416, 416)
                im = frame_process(frame, input_shape)
                if len(im.shape) == 3:
                    im = im.unsqueeze(0)  # Add batch dimension
                
                # Print input tensor info before inference
                print(f"Input tensor shape: {im.shape}")
                print(f"Input tensor type: {im.dtype}")
                
                # Ensure input is in the right format for NPU
                input_name = npu_session.get_inputs()[0].name
                input_shape = npu_session.get_inputs()[0].shape
                expected_type = npu_session.get_inputs()[0].type
                print(f"NPU expects input shape: {input_shape}, type: {expected_type}")
                
                # Convert tensor to numpy with the right type (usually float32 for NPU)
                input_data = im.numpy().astype(np.float32)
                
                # Force NPU execution
                print("Starting NPU inference...")
                try:
                    # Run inference on NPU
                    outputs = npu_session.run(None, {input_name: input_data})
                    print("NPU inference completed successfully")
                except Exception as e:
                    print(f"NPU inference failed: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
                
                # Postprocess outputs
                # First convert the outputs to PyTorch tensors
                outputs = [torch.tensor(item) for item in outputs]
                
                # Check the dimensions of the outputs and print for debugging
                for i, output in enumerate(outputs):
                    print(f"Output {i} shape: {output.shape}")
                
                # Process the outputs to match expected format
                preds = post_process(outputs)
                
                # Check processed outputs
                if not preds:
                    print("No valid predictions after post-processing")
                    continue
                    
                # For debugging
                for i, pred in enumerate(preds):
                    print(f"Processed prediction {i} shape: {pred.shape}")
                
                try:
                    # Apply non-max suppression
                    preds = non_max_suppression(
                        preds, 0.25, 0.7, agnostic=False, max_det=300, classes=None
                    )
                except Exception as e:
                    print(f"Error in non_max_suppression: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
                
                # Draw detections
                for result in preds:
                    for box in result:
                        # Get box coordinates
                        x1, y1, x2, y2 = box[:4]
                        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                        
                        # Get class and confidence
                        cls = int(box[5])
                        conf = float(box[4])
                        
                        # Skip detections that are likely to be heads
                        if is_head((x1, y1, x2, y2)):
                            continue
                        
                        # Map to our classes
                        if cls < len(classes):
                            label = classes[cls]
                            color = colors[cls]
                            
                            # Draw bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                            
                            # Add label
                            cv2.putText(frame, f"{label} {conf:.2f}", 
                                       (x1, y1 - 10), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 
                                       0.5, color, 2)
                            
                            # Print detection details
                            print(f"Detected: {label}, Confidence: {conf}, Box: {x1}, {y1}, {x2-x1}, {y2-y1}")
                            
                            # Save the detected object as a JPEG file if not already saved
                            if label not in detected_items:
                                save_detection(frame, (x1, y1, x2, y2), label, conf)
                                detected_items.add(label)
                            
                            # Update class counts
                            for i, class_name in enumerate(classes):
                                if label == class_name:
                                    trashlist[i] += 1
                                    break
                
                # Show detection frame using matplotlib
                ax.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                plt.draw()
                plt.pause(0.001)
                ax.clear()
            
            except Exception as e:
                print(f"Error during detection: {e}")
                import traceback
                traceback.print_exc()
    
    # Release resources
    cap.release()
    plt.close()
    
    return trashlist

def main():
    """
    Main function to run detection with a timeout
    """
    global running
    
    # Run detection in a separate thread
    detection_thread = threading.Thread(target=trashfunc)
    detection_thread.start()
    
    # Allow detection to run for a longer time 
    time.sleep(40)  
    
    # Stop the detection
    running = False
    detection_thread.join()
    
    # Print final results
    print("Final Detection Counts:", trashlist)

# Run the detection function
if __name__ == "__main__":
    main()