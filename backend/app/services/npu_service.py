import tensorflow as tf
import platform
import os
import logging
from typing import Optional

from app.utils.logger import get_logger

logger = get_logger(__name__)

def is_npu_available() -> bool:
    """
    Check if NPU (Neural Processing Unit) is available on the device.
    This function detects different types of NPUs or accelerators.
    
    Returns:
        bool: True if an NPU is available, False otherwise
    """
    try:
        # Check for Google Edge TPU
        if "EdgeTPU" in tf.config.list_physical_devices():
            logger.info("Google Edge TPU detected")
            return True
            
        # Check for Apple Neural Engine
        if platform.system() == "Darwin" and hasattr(tf, "config") and hasattr(tf.config, "list_physical_devices"):
            devices = tf.config.list_physical_devices()
            for device in devices:
                if "ANE" in device.name:
                    logger.info("Apple Neural Engine detected")
                    return True
        
        # Check for NNAPI delegate (Android devices)
        if platform.system() == "Linux" and "android" in platform.version().lower():
            logger.info("Android device detected, NNAPI should be available")
            return True
            
        # Check for Coral USB Accelerator
        if os.path.exists("/dev/apex_0") or any(os.path.exists(f"/sys/bus/usb/devices/*/idProduct") and 
                                               open(f"/sys/bus/usb/devices/*/idProduct").read().strip() == "8300"):
            logger.info("Coral USB Accelerator detected")
            return True
        
        # Check for Intel NCS or similar devices
        # This is a simplified check and may need to be expanded for production
        try:
            from openvino.inference_engine import IECore
            ie = IECore()
            devices = ie.available_devices
            if any(dev.startswith("MYRIAD") for dev in devices):
                logger.info("Intel Neural Compute Stick detected")
                return True
        except ImportError:
            pass
            
        # No known NPU found
        logger.info("No NPU detected, using CPU for inference")
        return False
        
    except Exception as e:
        logger.warning(f"Error checking for NPU: {e}")
        return False

def get_npu_delegate() -> Optional[tf.lite.experimental.Delegate]:
    """
    Get the appropriate TFLite delegate for the available NPU.
    
    Returns:
        A TFLite delegate object if available, None otherwise
    """
    try:
        # Check for Google Edge TPU
        try:
            from tflite_runtime.interpreter import load_delegate
            return load_delegate('libedgetpu.so.1')
        except (ImportError, ValueError):
            pass
            
        # Check for NNAPI delegate (Android)
        if platform.system() == "Linux" and "android" in platform.version().lower():
            return tf.lite.experimental.load_delegate('libnnapi.so')
            
        # Check for Coral delegate
        try:
            return tf.lite.experimental.load_delegate('libedgetpu.so.1.0')
        except ValueError:
            pass
            
        # Apple Core ML delegate (iOS and macOS)
        if platform.system() == "Darwin":
            try:
                return tf.lite.experimental.load_delegate('libcoreml_delegate.dylib')
            except ValueError:
                pass
        
        # Intel NCS / OpenVINO
        try:
            from openvino.inference_engine import IECore
            ie = IECore()
            devices = ie.available_devices
            if any(dev.startswith("MYRIAD") for dev in devices):
                # This is a simplification - in practice you'd need to use 
                # OpenVINO's dedicated API rather than a simple delegate
                pass
        except ImportError:
            pass
            
        # GPU Delegate as fallback if no dedicated NPU
        try:
            return tf.lite.experimental.load_delegate('libgpu_delegate.so')
        except ValueError:
            pass
            
        logger.warning("No NPU delegate could be loaded, falling back to CPU")
        return None
        
    except Exception as e:
        logger.error(f"Error getting NPU delegate: {e}")
        return None