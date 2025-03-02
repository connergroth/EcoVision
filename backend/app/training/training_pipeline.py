# Modify: backend/training/training_pipeline.py
import os
import subprocess
import argparse
from pathlib import Path
import sys
import time

def run_command(command, description):
    """Run a shell command and print the output"""
    print(f"\n{'='*80}")
    print(f"STEP: {description}")
    print(f"{'='*80}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    print(result.stdout)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    return True

def setup_environment():
    """Install all required packages"""
    print("\nSetting up environment...")
    
    packages = [
        "ultralytics",         # YOLOv8
        "opencv-python",       # Computer vision
        "albumentations",      # Data augmentation
        "onnx",                # ONNX model export
        "onnxruntime",         # ONNX runtime
        "tensorflow",          # TensorFlow (for integration)
        "torch",               # PyTorch
        "matplotlib",          # Visualization
        "pyyaml",              # YAML handling
        "tqdm",                # Progress bars
        "requests"             # HTTP requests for downloading
    ]
    
    cmd = f"{sys.executable} -m pip install {' '.join(packages)}"
    return run_command(cmd, "Installing required packages")

def check_directories():
    """Create required directories if they don't exist"""
    print("\nChecking and creating directories...")
    
    directories = [
        "backend/data/custom_dataset/images/train",
        "backend/data/custom_dataset/images/val",
        "backend/data/custom_dataset/labels/train",
        "backend/data/custom_dataset/labels/val",
        "backend/data/models",
        "backend/training/tuning_results"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Checked directory: {directory}")
    
    return True

def ensure_anchors_files():
    """Create anchor and stride files if they don't exist"""
    print("\nEnsuring anchor and stride files exist...")
    
    import numpy as np
    
    # Default anchors for YOLOv8
    anchors_path = Path('backend/data/anchors.npy')
    if not anchors_path.exists():
        # These are example values - you should extract actual values from your model
        anchors = np.array([
            [0.5, 0.5], [0.5, 0.5], [0.5, 0.5],  # P3/8
            [0.5, 0.5], [0.5, 0.5], [0.5, 0.5],  # P4/16
            [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]   # P5/32
        ])
        np.save(anchors_path, anchors)
        print(f"Created default anchors file at {anchors_path}")
    
    # Default strides for YOLOv8
    strides_path = Path('backend/data/strides.npy')
    if not strides_path.exists():
        strides = np.array([8., 16., 32.])
        np.save(strides_path, strides)
        print(f"Created default strides file at {strides_path}")
    
    return True

def prepare_trashnet_data():
    """Prepare the TrashNet dataset"""
    return run_command(f"{sys.executable} backend/data/prepare_trashnet.py", 
                      "Preparing TrashNet dataset")

def run_data_augmentation():
    """Run data augmentation"""
    return run_command(f"{sys.executable} backend/training/data_augmentation.py",
                      "Augmenting training data")

def run_hyperparameter_tuning():
    """Run hyperparameter tuning"""
    return run_command(f"{sys.executable} backend/training/hyperparameter_tuning.py --tune",
                      "Tuning hyperparameters")

def train_with_best_params():
    """Train model with best parameters"""
    return run_command(f"{sys.executable} backend/training/hyperparameter_tuning.py --train",
                      "Training with best parameters")

def train_direct():
    """Train model directly without hyperparameter tuning"""
    # Initialize model
    from ultralytics import YOLO
    
    print("\nTraining YOLOv8 model directly...")
    
    # Initialize model
    model = YOLO('yolov8m.pt')
    
    # Dataset config
    dataset_config = 'backend/data/custom_dataset/dataset.yaml'
    
    if not os.path.exists(dataset_config):
        print(f"Dataset configuration not found at {dataset_config}")
        return False
    
    # Train with default parameters
    results = model.train(
        data=dataset_config,
        epochs=100,  # Full training run
        imgsz=640,
        batch=16,
        name='trashnet_run',
        patience=20,
        save=True
    )
    
    # Export model
    model.export(format='onnx', dynamic=True)
    
    # Move model to correct location
    target_path = 'backend/data/models/yolov8m_recycling.onnx'
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    try:
        os.rename('runs/detect/trashnet_run/weights/best.onnx', target_path)
        print(f"Model saved to: {target_path}")
        return True
    except Exception as e:
        print(f"Error moving model: {e}")
        return False

def run_model_testing():
    """Test the trained model"""
    return run_command(f"{sys.executable} backend/training/test_model.py --validate",
                      "Testing trained model")

def run_webcam_test():
    """Test model with webcam"""
    return run_command(f"{sys.executable} backend/training/test_model.py --webcam",
                      "Testing with webcam")

def update_production_model():
    """Update the production model with the new model"""
    source = 'backend/data/models/yolov8m_recycling.onnx'
    target = 'backend/data/models/yolov8m.onnx'
    
    if not os.path.exists(source):
        print(f"Error: Trained model not found at {source}")
        return False
    
    # Create backup of current model if it exists
    if os.path.exists(target):
        backup = f"{target}.backup.{int(time.time())}"
        os.rename(target, backup)
        print(f"Created backup of current model: {backup}")
    
    # Copy new model to production
    import shutil
    shutil.copy2(source, target)
    print(f"Updated production model: {target}")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='YOLOv8 Recycling Model Training Pipeline with TrashNet')
    parser.add_argument('--all', action='store_true', help='Run the complete pipeline')
    parser.add_argument('--setup', action='store_true', help='Set up the environment')
    parser.add_argument('--trashnet', action='store_true', help='Prepare TrashNet dataset')
    parser.add_argument('--augment', action='store_true', help='Augment training data')
    parser.add_argument('--tune', action='store_true', help='Tune hyperparameters')
    parser.add_argument('--train', action='store_true', help='Train with best parameters')
    parser.add_argument('--train-direct', action='store_true', help='Train directly without tuning')
    parser.add_argument('--test', action='store_true', help='Test trained model')
    parser.add_argument('--webcam', action='store_true', help='Test with webcam')
    parser.add_argument('--update', action='store_true', help='Update production model')
    
    args = parser.parse_args()
    
    # If no arguments provided, show help
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    # Run the complete pipeline
    if args.all:
        steps = [
            ("Setting up environment", setup_environment),
            ("Checking directories", check_directories),
            ("Ensuring anchor files", ensure_anchors_files),
            ("Preparing TrashNet dataset", prepare_trashnet_data),
            ("Augmenting data", run_data_augmentation),
            ("Training with TrashNet", train_direct),
            ("Testing model", run_model_testing),
            ("Testing with webcam", run_webcam_test),
            ("Updating production model", update_production_model)
        ]
        
        for description, func in steps:
            print(f"\n{'='*80}")
            print(f"PIPELINE STEP: {description}")
            print(f"{'='*80}")
            
            success = func()
            if not success:
                print(f"\nPipeline failed at step: {description}")
                return
        
        print("\nComplete pipeline finished successfully!")
        return
    
    # Run individual steps
    if args.setup:
        setup_environment()
        check_directories()
        ensure_anchors_files()
    
    if args.trashnet:
        prepare_trashnet_data()
    
    if args.augment:
        run_data_augmentation()
    
    if args.tune:
        run_hyperparameter_tuning()
    
    if args.train:
        train_with_best_params()
        
    if args.train_direct:
        train_direct()
    
    if args.test:
        run_model_testing()
    
    if args.webcam:
        run_webcam_test()
    
    if args.update:
        update_production_model()

if __name__ == "__main__":
    main()