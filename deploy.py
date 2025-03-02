import cv2
import numpy as np
from ultralytics import YOLO
import time
import threading

# Global variables
returnlist = []
trashlist = [0, 0, 0, 0, 0]
count = 0
classes = ['cardboard/paper', 'glass', 'metal', 'plastic', 'trash']
running = True

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

def trashfunc():
    """
    Detect and classify waste objects using YOLOv8
    
    Returns:
        List of class detection counts
    """
    global count, trashlist, running
    
    # Reset global variables
    trashlist = [0, 0, 0, 0, 0]
    count = 0
    running = True
    
    # Load pre-trained YOLOv8 model
    try:
        # Use the custom trained model
        model = YOLO('model\\best1.pt')
    except Exception as e:
        print(f"Error loading model: {e}")
        return trashlist
    
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
    
    while running:
        # Read frame
        ret, frame = cap.read()
        
        # Exit on 'q' press
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        
        if ret:
            # Display original frame
            cv2.imshow("Image", frame)
            
            try:
                # Run YOLOv8 detection
                results = model(frame, conf=0.25, verbose=False)
                
                # Draw detections
                for result in results:
                    boxes = result.boxes
                    
                    for box in boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0]
                        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                        
                        # Get class and confidence
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        
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
                            
                            # Update class counts
                            for i, class_name in enumerate(classes):
                                if label == class_name:
                                    trashlist[i] += 1
                                    break
                
                # Show detection frame
                cv2.imshow("detect", frame)
            
            except Exception as e:
                print(f"Error during detection: {e}")
                import traceback
                traceback.print_exc()
    
    # Release resources
    cap.release()
    cv2.destroyAllWindows()
    
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