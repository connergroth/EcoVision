# Create a data collection script in a new file: backend/data/data_collection.py
import os
import cv2
import datetime

def collect_training_data():
    # Create directory structure
    base_dir = 'backend/data/custom_dataset'
    os.makedirs(f'{base_dir}/images/train', exist_ok=True)
    os.makedirs(f'{base_dir}/images/val', exist_ok=True)
    os.makedirs(f'{base_dir}/labels/train', exist_ok=True)
    os.makedirs(f'{base_dir}/labels/val', exist_ok=True)
    
    # Capture images from webcam
    cap = cv2.VideoCapture(0)
    category = input("Enter category (plastic/metal/paper/glass/organic/other): ")
    
    img_count = 0
    while img_count < 50:  # Collect 50 images per category
        ret, frame = cap.read()
        if not ret:
            break
            
        cv2.imshow('Frame', frame)
        key = cv2.waitKey(1)
        
        if key == ord('s'):  # Press 's' to save
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"{base_dir}/images/train/{category}_{timestamp}.jpg"
            cv2.imwrite(filename, frame)
            img_count += 1
            print(f"Saved {img_count}/50")
        
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()