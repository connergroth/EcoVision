# Create a file: backend/training/hyperparameter_tuning.py
from ultralytics import YOLO
import yaml
import json
import os
from pathlib import Path
import itertools
import time

def tune_hyperparameters():
    """
    Perform hyperparameter tuning for the YOLOv8 recycling model.
    This will try different combinations of parameters to find the best model.
    """
    # Define the hyperparameter search space
    param_grid = {
        'lr0': [0.01, 0.001],  # Initial learning rate
        'lrf': [0.01, 0.1],    # Final learning rate factor
        'momentum': [0.8, 0.9, 0.937],  # SGD momentum
        'weight_decay': [0.0005, 0.001],  # Weight decay
        'warmup_epochs': [1.0, 3.0],  # Warmup epochs
        'warmup_momentum': [0.5, 0.8],  # Warmup momentum
        'box': [7.5, 10.0],  # Box loss gain
        'cls': [0.5, 1.0],   # Class loss gain
        'hsv_h': [0.0, 0.1], # HSV Hue augmentation
        'hsv_s': [0.0, 0.9], # HSV Saturation augmentation
        'hsv_v': [0.0, 0.9], # HSV Value augmentation
        'degrees': [0.0, 10.0],  # Rotation augmentation
        'translate': [0.0, 0.2],  # Translation augmentation
        'scale': [0.0, 0.9],      # Scale augmentation
        'fliplr': [0.0, 0.5],     # Horizontal flip augmentation
        'mosaic': [0.0, 1.0],     # Mosaic augmentation
    }
    
    # For quick tuning, we'll only test a subset of combinations
    # Choose key hyperparameters for tuning
    quick_param_grid = {
        'lr0': [0.01, 0.001],
        'momentum': [0.9, 0.937],
        'box': [7.5, 10.0],
        'cls': [0.5, 1.0],
    }
    
    # Define dataset configuration - must match your dataset path
    dataset_config = '../data/custom_dataset/dataset.yaml'
    
    # Check if dataset config exists
    if not os.path.exists(dataset_config):
        print(f"Dataset configuration not found at {dataset_config}")
        print("Creating default dataset configuration...")
        
        # Create default dataset config
        config = {
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
        
        with open(dataset_config, 'w') as f:
            yaml.dump(config, f)
    
    # Create output directory for tuning results
    os.makedirs('backend/training/tuning_results', exist_ok=True)
    results_file = 'backend/training/tuning_results/results.json'
    
    # Initialize results dictionary
    all_results = []
    
    # Load any existing results
    if os.path.exists(results_file):
        with open(results_file, 'r') as f:
            try:
                all_results = json.load(f)
                print(f"Loaded {len(all_results)} existing tuning results")
            except:
                print("Error loading existing results, starting fresh")
                all_results = []
    
    # For quick tuning, we'll generate all combinations of the quick grid
    param_combinations = list(itertools.product(*quick_param_grid.values()))
    total_combinations = len(param_combinations)
    
    print(f"Running hyperparameter tuning with {total_combinations} combinations")
    
    for i, values in enumerate(param_combinations):
        # Create hyperparameter dictionary for this run
        params = dict(zip(quick_param_grid.keys(), values))
        print(f"\nTuning Run {i+1}/{total_combinations}")
        print(f"Parameters: {params}")
        
        # Check if we already have results for these parameters
        if any(all(r.get(k) == v for k, v in params.items()) for r in all_results):
            print("Already have results for these parameters, skipping")
            continue
        
        # Create a new model for each run
        model = YOLO('yolov8m.pt')
        
        # Set run name based on parameters
        run_name = f"tune_run_{i+1}"
        
        # Start time
        start_time = time.time()
        
        # Train with these hyperparameters
        try:
            results = model.train(
                data=dataset_config,
                epochs=20,  # Use fewer epochs for tuning
                imgsz=640,
                batch=16,
                name=run_name,
                **params
            )
            
            # Get validation results
            metrics = model.val()
            
            # Record results
            run_results = {
                **params,
                'map50': float(metrics.box.map50),
                'map50_95': float(metrics.box.map50_95),
                'precision': float(metrics.box.p),
                'recall': float(metrics.box.r),
                'f1': float(metrics.box.f1),
                'training_time': time.time() - start_time
            }
            
            all_results.append(run_results)
            
            # Save updated results
            with open(results_file, 'w') as f:
                json.dump(all_results, f, indent=2)
            
            print(f"Run {i+1} completed in {run_results['training_time']:.2f} seconds")
            print(f"mAP50: {run_results['map50']:.4f}, Precision: {run_results['precision']:.4f}, Recall: {run_results['recall']:.4f}")
            
        except Exception as e:
            print(f"Error in tuning run {i+1}: {e}")
    
    # Find best parameters
    if all_results:
        # Sort by mAP50_95
        sorted_results = sorted(all_results, key=lambda x: x.get('map50_95', 0), reverse=True)
        best_params = sorted_results[0]
        
        print("\n=== Best Hyperparameters ===")
        print(f"mAP50-95: {best_params.get('map50_95', 0):.4f}")
        print(f"Precision: {best_params.get('precision', 0):.4f}")
        print(f"Recall: {best_params.get('recall', 0):.4f}")
        
        # Save best parameters
        with open('backend/training/best_params.yaml', 'w') as f:
            # Only save the hyperparameters, not the metrics
            hyperparams = {k: v for k, v in best_params.items() 
                         if k not in ['map50', 'map50_95', 'precision', 'recall', 'f1', 'training_time']}
            yaml.dump(hyperparams, f)
        
        print("\nBest parameters saved to backend/training/best_params.yaml")
        print("Use these parameters for the final training run")

def train_with_best_params():
    """Train the model with the best hyperparameters found during tuning"""
    # Check if best_params.yaml exists
    if not os.path.exists('backend/training/best_params.yaml'):
        print("No best parameters file found. Run tune_hyperparameters first.")
        return
    
    # Load best parameters
    with open('backend/training/best_params.yaml', 'r') as f:
        best_params = yaml.safe_load(f)
    
    print("Training with best parameters:")
    for k, v in best_params.items():
        print(f"  {k}: {v}")
    
    # Initialize model
    model = YOLO('yolov8m.pt')
    
    # Dataset config
    dataset_config = '../data/custom_dataset/dataset.yaml'
    
    # Train with best parameters
    results = model.train(
        data=dataset_config,
        epochs=100,  # Full training run
        imgsz=640,
        batch=16,
        name='best_params_run',
        patience=20,
        save=True,
        **best_params
    )
    
    # Export model
    model.export(format='onnx', dynamic=True)
    
    # Move model to correct location
    os.rename('runs/detect/best_params_run/weights/best.onnx', 
              '../data/models/yolov8m_recycling_tuned.onnx')
    
    print("\nTraining complete!")
    print("Model saved to: ../data/models/yolov8m_recycling_tuned.onnx")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Hyperparameter tuning for YOLOv8 recycling model')
    parser.add_argument('--tune', action='store_true', help='Run hyperparameter tuning')
    parser.add_argument('--train', action='store_true', help='Train with best parameters')
    
    args = parser.parse_args()
    
    if args.tune:
        tune_hyperparameters()
    elif args.train:
        train_with_best_params()
    else:
        print("Please specify an action: --tune or --train")