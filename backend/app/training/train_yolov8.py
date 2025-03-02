# Create a file: backend/training/train_yolov8.py
from ultralytics import YOLO
import yaml
import os

# Define dataset configuration
def create_dataset_config():
    dataset_config = {
        'path': '../data/custom_dataset',
        'train': 'images/train',
        'val': 'images/val',
        'names': {
            0: 'plastic',
            1: 'metal',
            2: 'paper',
            3: 'glass',
            4: 'organic',
            5: 'other'
        }
    }
    
    # Save as YAML file
    with open('../data/custom_dataset/dataset.yaml', 'w') as f:
        yaml.dump(dataset_config, f)
    
    return '../data/custom_dataset/dataset.yaml'

def train_model():
    # Create dataset config
    dataset_config = create_dataset_config()
    
    # Load a pre-trained YOLOv8 model
    model = YOLO('yolov8m.pt')
    
    # Train the model on your custom dataset
    results = model.train(
        data=dataset_config,
        epochs=100,
        imgsz=640,
        batch=16,
        patience=20,
        save=True,
        device=0  # Use GPU if available
    )
    
    # Save the trained model
    model.export(format='onnx', dynamic=True)
    
    # Move the model to the right location
    os.rename('runs/detect/train/weights/best.onnx', '../data/models/yolov8m_recycling.onnx')
    
    print("Model training complete. Model saved to: ../data/models/yolov8m_recycling.onnx")

if __name__ == "__main__":
    train_model()