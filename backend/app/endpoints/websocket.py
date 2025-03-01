from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import base64
import json
import logging
from typing import Dict, List
import asyncio

from app.services.detection_service import process_image, detect_objects
from app.services.firebase_service import verify_firebase_token
from app.config import settings
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Track active connections
active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/detection/{user_id}")
async def websocket_detection(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time detection processing.
    
    Allows for faster processing of webcam stream without the overhead
    of HTTP requests for each frame.
    """
    # Accept the connection
    await websocket.accept()
    
    try:
        # Get token for authentication
        auth_message = await websocket.receive_text()
        auth_data = json.loads(auth_message)
        token = auth_data.get("token")
        
        if not token:
            await websocket.send_json({"error": "Authentication required"})
            await websocket.close()
            return
        
        # Verify token
        try:
            user = await verify_firebase_token(token, lightweight=True)
            if user["uid"] != user_id:
                await websocket.send_json({"error": "User ID mismatch"})
                await websocket.close()
                return
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            await websocket.send_json({"error": f"Authentication failed: {str(e)}"})
            await websocket.close()
            return
        
        # Add to active connections
        active_connections[user_id] = websocket
        logger.info(f"WebSocket connection established for user {user_id}")
        
        # Send confirmation
        await websocket.send_json({"status": "connected", "message": "WebSocket connection established"})
        
        # Process incoming frames
        while True:
            # Wait for next frame
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            # Extract image data
            try:
                image_data = base64.b64decode(frame_data["image"])
                client_confidence = frame_data.get("confidence")
                
                # Process image with optimized settings for streaming
                processed_image = process_image(image_data, resize_for_streaming=True)
                detections = detect_objects(processed_image, optimized_for_streaming=True)
                
                # Check confidence threshold
                if not detections or max(d.confidence for d in detections) < settings.DETECTION_CONFIDENCE_THRESHOLD:
                    # No high confidence detection, send minimal response
                    await websocket.send_json({
                        "status": "processing",
                        "detection": None
                    })
                    continue
                
                # Get best detection
                best_detection = max(detections, key=lambda d: d.confidence)
                
                # Send detection result
                await websocket.send_json({
                    "status": "detection",
                    "detection": {
                        "category": best_detection.category.value,
                        "confidence": best_detection.confidence,
                        "bounding_box": best_detection.bounding_box.dict() if best_detection.bounding_box else None
                    }
                })
                
            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await websocket.send_json({
                    "status": "error",
                    "message": f"Error processing frame: {str(e)}"
                })
    
    except WebSocketDisconnect:
        # Remove from active connections
        if user_id in active_connections:
            del active_connections[user_id]
        logger.info(f"WebSocket connection closed for user {user_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
            await websocket.close()
        except:
            pass
        
        # Cleanup
        if user_id in active_connections:
            del active_connections[user_id]