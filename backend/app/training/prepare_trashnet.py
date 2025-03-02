# Create a file: backend/data/prepare_trashnet.py
import os
import shutil
import random
import requests
import zipfile
import cv2
import numpy as np
from pathlib import Path
from tqdm import tqdm
import yaml

def download_trashnet():
    """Download the TrashNet dataset"""
    url = "https://github.com/garythung/trashnet/archive/refs/heads/master.zip"
    zip_path = "backend/data/trashnet.zip"
    extract_path = "backend/data/trashnet-master"
    
    # Create directories if they don't exist
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    
    if not os.path.exists(zip_path):
        print("Downloading TrashNet dataset...")
        response = requests.get(url, stream=True)
        total_size = int(response.headers.get('content-length', 0))
        
        with open(zip_path, 'wb') as file, tqdm(
            desc="Downloading",
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for data in response.iter_content(chunk_size=1024):
                size = file.write(data)
                bar.update(size)
    
    # Extract if needed
    if not os.path.exists(extract_path):
        print("Extracting dataset...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall("backend/data/")
    
    return os.path.join(extract_path, "data")

def create_yolo_dataset(trashnet_path):
    """Convert TrashNet dataset to YOLO format"""
    # Define paths
    dataset_path = "backend/data/custom_dataset"
    images_train_path = os.path.join(dataset_path, "images", "train")
    images_val_path = os.path.join(dataset_path, "images", "val")
    labels_train_path = os.path.join(dataset_path, "labels", "train")
    labels_val_path = os.path.join(dataset_path, "labels", "val")
    
    # Create directories
    for path in [images_train_path, images_val_path, labels_train_path, labels_val_path]:
        os.makedirs(path, exist_ok=True)
    
    # TrashNet categories to our categories mapping
    # TrashNet: glass, paper, cardboard, plastic, metal, trash
    # Our categories: plastic, metal, paper, glass, organic, other
    category_mapping = {
        'glass': 3,     # glass -> glass (3)
        'paper': 2,     # paper -> paper (2)
        'cardboard': 2, # cardboard -> paper (2)
        'plastic': 0,   # plastic -> plastic (0)
        'metal': 1,     # metal -> metal (1)
        'trash': 5      # trash -> other (5)
    }
    
    # Find all image files in dataset
    all_images = []
    for category in category_mapping.keys():
        category_path = os.path.join(trashnet_path, category)
        if os.path.exists(category_path):
            images = [os.path.join(category_path, f) for f in os.listdir(category_path) 
                     if f.endswith(('.jpg', '.jpeg', '.png'))]
            for img in images:
                all_images.append((img, category))
    
    # Shuffle the dataset
    random.shuffle(all_images)
    
    # Split into train and validation sets (80% train, 20% validation)
    split_idx = int(len(all_images) * 0.8)
    train_images = all_images[:split_idx]
    val_images = all_images[split_idx:]
    
    print(f"Total images: {len(all_images)}")
    print(f"Training images: {len(train_images)}")
    print(f"Validation images: {len(val_images)}")
    
    # Process training images
    process_images(train_images, images_train_path, labels_train_path, category_mapping)
    
    # Process validation images
    process_images(val_images, images_val_path, labels_val_path, category_mapping)
    
    # Create dataset YAML file
    create_dataset_yaml(dataset_path)
    
    return dataset_path

def process_images(image_list, images_path, labels_path, category_mapping):
    """Process images and create YOLO format labels"""
    for idx, (img_path, category) in enumerate(tqdm(image_list, desc="Processing images")):
        # Read image
        img = cv2.imread(img_path)
        if img is None:
            print(f"Warning: Could not read image {img_path}")
            continue
        
        # Get image dimensions
        height, width = img.shape[:2]
        
        # Save image with new name
        new_img_name = f"{idx:06d}.jpg"
        new_img_path = os.path.join(images_path, new_img_name)
        cv2.imwrite(new_img_path, img)
        
        # For TrashNet, we need to do object detection
        # Since TrashNet doesn't have bounding boxes, we'll create one that covers most of the image
        # In a real scenario, you'd want to use object detection to find the actual objects
        
        # Create a bounding box that covers 80% of the image
        x_center = 0.5  # center x (normalized)
        y_center = 0.5  # center y (normalized)
        bbox_width = 0.8  # width (normalized)
        bbox_height = 0.8  # height (normalized)
        
        # Get class index from mapping
        class_idx = category_mapping[category]
        
        # Create label file
        label_path = os.path.join(labels_path, f"{idx:06d}.txt")
        with open(label_path, 'w') as f:
            # YOLO format: class_idx center_x center_y width height
            f.write(f"{class_idx} {x_center} {y_center} {bbox_width} {bbox_height}\n")

def create_dataset_yaml(dataset_path):
    """Create YAML configuration file for the dataset"""
    yaml_path = os.path.join(dataset_path, "dataset.yaml")
    
    data = {
        'path': dataset_path,
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
    
    with open(yaml_path, 'w') as f:
        yaml.dump(data, f)
    
    print(f"Created dataset configuration at {yaml_path}")

def main():
    # Install required packages
    try:
        import yaml
        import tqdm
    except ImportError:
        import subprocess
        print("Installing required packages...")
        subprocess.run(['pip', 'install', 'pyyaml', 'tqdm', 'requests', 'opencv-python', 'numpy'])
        import yaml
        import tqdm
    
    # Download TrashNet
    trashnet_path = download_trashnet()
    
    # Convert to YOLO format
    dataset_path = create_yolo_dataset(trashnet_path)
    
    print("\nDataset preparation complete!")
    print(f"Dataset saved to: {dataset_path}")
    print("\nYou can now proceed with training:")
    print("python training/training_pipeline.py --train")

if __name__ == "__main__":
    main()