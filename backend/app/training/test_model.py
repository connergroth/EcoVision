# Create a file: backend/training/test_model.py
from ultralytics import YOLO
import os
import cv2
import numpy as np
import time
import matplotlib.pyplot as plt
from pathlib import Path
import torch
import json

def test_trained_model():
    """Test your trained model on the validation dataset"""
    # Load the model
    model_path = 'backend/data/models/yolov8m_recycling.onnx'
    try:
        model = YOLO(model_path)
        print(f"Successfully loaded model from {model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")
        # Try loading from training output directory
        try:
            model = YOLO('runs/detect/train/weights/best.onnx')
            print("Loaded model from training output directory")
        except:
            print("Failed to load model. Make sure training has completed.")
            return
    
    # Run validation
    results = model.val()
    
    # Print metrics
    metrics = results.box
    print("\n=== Model Evaluation Results ===")
    print(f"mAP50-95: {metrics.map50_95:.4f}")
    print(f"mAP50: {metrics.map50:.4f}")
    print(f"Precision: {metrics.p:.4f}")
    print(f"Recall: {metrics.r:.4f}")
    print(f"F1-Score: {metrics.f1:.4f}")
    
    # Per-class metrics
    class_names = ['plastic', 'metal', 'paper', 'glass', 'organic', 'other']
    print("\n=== Per-Class Performance ===")
    for i, name in enumerate(class_names):
        print(f"{name}: mAP50={metrics.maps50[i]:.4f}, P={metrics.p[i]:.4f}, R={metrics.r[i]:.4f}")
    
    # Save metrics to JSON for future comparison
    metrics_dict = {
        "map": float(metrics.map50_95),
        "map50": float(metrics.map50),
        "precision": float(metrics.p),
        "recall": float(metrics.r),
        "f1": float(metrics.f1),
        "classes": {name: {"map50": float(metrics.maps50[i]), "precision": float(metrics.p[i]), 
                           "recall": float(metrics.r[i])} 
                    for i, name in enumerate(class_names)}
    }
    
    with open('backend/training/model_metrics.json', 'w') as f:
        json.dump(metrics_dict, f, indent=2)
    
    print("\nMetrics saved to backend/training/model_metrics.json")

def test_with_webcam():
    """Test the model with webcam for real-time evaluation"""
    model_path = 'backend/data/models/yolov8m_recycling.onnx'
    try:
        model = YOLO(model_path)
    except:
        print("Failed to load model. Make sure training has completed.")
        return
        
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    class_names = ['plastic', 'metal', 'paper', 'glass', 'organic', 'other']
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Start timer for FPS calculation
        start_time = time.time()
        
        # Perform detection
        results = model(frame)
        
        # Plot results on the frame
        result_image = results[0].plot()
        
        # Calculate FPS
        fps = 1.0 / (time.time() - start_time)
        
        # Display FPS
        cv2.putText(result_image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Display the results
        cv2.imshow('YOLOv8 Recycling Detection', result_image)
        
        # Check for 'q' key to exit
        if cv2.waitKey(1) == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

def compare_with_baseline():
    """Compare current model with previous versions"""
    # Load current metrics
    try:
        with open('backend/training/model_metrics.json', 'r') as f:
            current = json.load(f)
    except:
        print("Current model metrics not found. Run test_trained_model first.")
        return
    
    # Load previous metrics if they exist
    baseline_path = 'backend/training/baseline_metrics.json'
    if os.path.exists(baseline_path):
        try:
            with open(baseline_path, 'r') as f:
                baseline = json.load(f)
                
            print("\n=== Model Comparison ===")
            print(f"mAP50-95: {current['map']:.4f} (Current) vs {baseline['map']:.4f} (Baseline) | Change: {current['map'] - baseline['map']:.4f}")
            print(f"Precision: {current['precision']:.4f} (Current) vs {baseline['precision']:.4f} (Baseline) | Change: {current['precision'] - baseline['precision']:.4f}")
            print(f"Recall: {current['recall']:.4f} (Current) vs {baseline['recall']:.4f} (Baseline) | Change: {current['recall'] - baseline['recall']:.4f}")
            
            # Per-class comparison
            print("\n=== Per-Class Comparison ===")
            for class_name in current['classes']:
                if class_name in baseline['classes']:
                    curr = current['classes'][class_name]
                    base = baseline['classes'][class_name]
                    print(f"{class_name}: mAP50={curr['map50']:.4f} vs {base['map50']:.4f} | Change: {curr['map50'] - base['map50']:.4f}")
            
        except:
            print("Error loading baseline metrics for comparison.")
    else:
        print("No baseline metrics found. To set current metrics as baseline, use save_as_baseline().")

def save_as_baseline():
    """Save current metrics as the baseline for future comparisons"""
    if os.path.exists('backend/training/model_metrics.json'):
        try:
            import shutil
            shutil.copy('backend/training/model_metrics.json', 'backend/training/baseline_metrics.json')
            print("Current metrics saved as baseline for future comparisons.")
        except Exception as e:
            print(f"Error saving baseline: {e}")
    else:
        print("No metrics file found. Run test_trained_model first.")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test YOLOv8 recycling model')
    parser.add_argument('--validate', action='store_true', help='Run validation on test dataset')
    parser.add_argument('--webcam', action='store_true', help='Test with webcam')
    parser.add_argument('--compare', action='store_true', help='Compare with baseline')
    parser.add_argument('--set-baseline', action='store_true', help='Set current metrics as baseline')
    
    args = parser.parse_args()
    
    if args.validate:
        test_trained_model()
    elif args.webcam:
        test_with_webcam()
    elif args.compare:
        compare_with_baseline()
    elif args.set_baseline:
        save_as_baseline()
    else:
        # If no argument provided, run validation
        test_trained_model()