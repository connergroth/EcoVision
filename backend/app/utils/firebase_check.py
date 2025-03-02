import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
import json
import os
from pathlib import Path

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

def check_firebase_config():
    """
    Check Firebase configuration and verify connection.
    Returns a dictionary with status info.
    """
    results = {
        "service_account_exists": False,
        "service_account_valid": False,
        "firestore_connection": False,
        "storage_connection": False,
        "issues": []
    }
    
    # Check if service account file exists
    service_account_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
    if not os.path.exists(service_account_path):
        results["issues"].append(f"Service account file not found at {service_account_path}")
        return results
    
    results["service_account_exists"] = True
    
    # Check if service account file is valid JSON
    try:
        with open(service_account_path, 'r') as f:
            service_account = json.load(f)
            
        required_fields = ["type", "project_id", "private_key_id", "private_key", "client_email"]
        missing_fields = [field for field in required_fields if field not in service_account]
        
        if missing_fields:
            results["issues"].append(f"Service account file missing fields: {', '.join(missing_fields)}")
            return results
            
        results["service_account_valid"] = True
        
    except json.JSONDecodeError:
        results["issues"].append("Service account file is not valid JSON")
        return results
    except Exception as e:
        results["issues"].append(f"Error reading service account file: {str(e)}")
        return results
    
    # Check Firebase connection using app from firebase_service.py
    try:
        from app.services.firebase_service import db, bucket
        
        if db:
            # Try a simple Firestore operation
            try:
                db.collection('test').document('test').set({"timestamp": firestore.SERVER_TIMESTAMP})
                db.collection('test').document('test').delete()
                results["firestore_connection"] = True
            except Exception as e:
                results["issues"].append(f"Firestore connection failed: {str(e)}")
        else:
            results["issues"].append("Firestore client not initialized")
        
        if bucket:
            # Try a simple Storage operation
            try:
                test_file = Path("test_firebase.txt")
                test_file.write_text("Test Firebase connection")
                
                blob = bucket.blob("test/connection_test.txt")
                blob.upload_from_filename(str(test_file))
                blob.delete()
                
                test_file.unlink()
                results["storage_connection"] = True
            except Exception as e:
                results["issues"].append(f"Storage connection failed: {str(e)}")
        else:
            results["issues"].append("Storage bucket not initialized")
            
    except ImportError:
        results["issues"].append("Failed to import Firebase modules")
    except Exception as e:
        results["issues"].append(f"Firebase connection error: {str(e)}")
    
    return results

def validate_firebase_settings():
    """
    Validate Firebase settings at startup.
    Logs warnings but doesn't prevent startup.
    """
    try:
        results = check_firebase_config()
        
        if results["service_account_exists"] and results["service_account_valid"]:
            logger.info("Firebase service account is valid")
        else:
            logger.warning("Firebase service account issues detected")
            for issue in results["issues"]:
                logger.warning(f"Firebase issue: {issue}")
            
        if results["firestore_connection"]:
            logger.info("Firebase Firestore connection successful")
        else:
            logger.warning("Firebase Firestore connection failed")
            
        if results["storage_connection"]:
            logger.info("Firebase Storage connection successful")
        else:
            logger.warning("Firebase Storage connection failed")
            
        return len(results["issues"]) == 0
        
    except Exception as e:
        logger.error(f"Error validating Firebase settings: {e}")
        return False