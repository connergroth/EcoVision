# Create a file: backend/training/annotation_setup.py
import os
import subprocess
import random
import shutil
from pathlib import Path

def setup_annotation_project():
    """Set up directory structure and prepare for annotation"""
    base_dir = Path('backend/data/custom_dataset')
    
    # Create the required directories if they don't exist
    (base_dir / 'images' / 'train').mkdir(parents=True, exist_ok=True)
    (base_dir / 'images' / 'val').mkdir(parents=True, exist_ok=True)
    (base_dir / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
    (base_dir / 'labels' / 'val').mkdir(parents=True, exist_ok=True)
    
    print("Directory structure created.")
    
    # Check if labelImg is installed, install if not
    try:
        subprocess.run(['pip', 'install', 'labelImg'])
        print("LabelImg installed successfully.")
    except Exception as e:
        print(f"Error installing LabelImg: {e}")
        print("Please install manually: pip install labelImg")
    
    # Create predefined_classes.txt for LabelImg
    classes = ['plastic', 'metal', 'paper', 'glass', 'organic', 'other']
    with open(base_dir / 'predefined_classes.txt', 'w') as f:
        for cls in classes:
            f.write(f"{cls}\n")
    
    print("Created predefined_classes.txt for annotation")
    print("\nTo annotate your images:")
    print("1. Run: labelImg")
    print(f"2. Open the directory: {base_dir}/images/train")
    print("3. Use the predefined classes")
    print("4. Save annotations in YOLO format to the 'labels/train' directory")

def split_dataset(train_ratio=0.8):
    """Split the annotated dataset into training and validation sets"""
    base_dir = Path('backend/data/custom_dataset')
    images_dir = base_dir / 'images' / 'train'
    labels_dir = base_dir / 'labels' / 'train'
    
    # Get all image files
    image_files = list(images_dir.glob('*.jpg')) + list(images_dir.glob('*.png'))
    
    # Randomly select validation set
    val_size = int(len(image_files) * (1 - train_ratio))
    val_images = random.sample(image_files, val_size)
    
    # Move validation images and their corresponding labels
    for img_path in val_images:
        # Get the corresponding label file
        img_name = img_path.stem
        label_path = labels_dir / f"{img_name}.txt"
        
        # Move image
        shutil.move(str(img_path), str(base_dir / 'images' / 'val' / img_path.name))
        
        # Move label if it exists
        if label_path.exists():
            shutil.move(str(label_path), str(base_dir / 'labels' / 'val' / label_path.name))
    
    print(f"Dataset split completed: {len(image_files) - val_size} training images, {val_size} validation images")

if __name__ == "__main__":
    setup_annotation_project()
    
    # After annotation is complete, uncomment this to split the dataset
    # split_dataset(train_ratio=0.8)