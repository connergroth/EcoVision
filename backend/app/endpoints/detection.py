from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Header
from fastapi.responses import JSONResponse
import logging
import base64
import io
from uuid import uuid4
from datetime import datetime
from typing import Optional

from app.models import DetectionRequest, DetectionResponse, RecyclableCategory
from app.services.detection_service import process_image, detect_objects
from app.services.firebase_service import verify_firebase_token, update_user_points, add_scan_record
from app.services.external_api import get_recycling_info
from app.config import settings
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/detect", response_model=DetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    authorization: Optional[str] = Header(None),
    is_webcam_snapshot: bool = Form(True, description="Whether this is a snapshot from webcam stream"),
    client_confidence: Optional[float] = Form(None, description="Confidence level from client-side detection")
):
    """
    Process an uploaded image to detect recyclable objects.
    
    - Verifies the user using Firebase authentication
    - Processes the image and detects objects using the model
    - If a high-confidence detection is found, fetches additional information
    - Records the detection in the user's history and updates their points
    
    This endpoint supports the webcam stream workflow where the frontend may have already
    performed preliminary detection and sent a high-confidence snapshot.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
        # Ensure user_id matches token
        if user["uid"] != user_id:
            raise HTTPException(status_code=403, detail="User ID does not match token")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    # Read and process the uploaded image
    try:
        image_content = await file.read()
        processed_image = process_image(image_content)
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Image processing failed: {str(e)}"
        )
    
    # Set confidence threshold - potentially use client confidence if provided and trusted
    confidence_threshold = settings.DETECTION_CONFIDENCE_THRESHOLD
    if is_webcam_snapshot and client_confidence is not None:
        # We can choose to trust client confidence or verify it
        logger.info(f"Client provided confidence: {client_confidence}")
        # Can implement logic to adjust server-side threshold based on client confidence
    
    # Run object detection
    try:
        detections = detect_objects(processed_image)
        
        # If no detections or below threshold
        if not detections or max(d.confidence for d in detections) < confidence_threshold:
            return DetectionResponse(
                success=True,
                detection=None,
                error_message="No recyclable items detected with sufficient confidence"
            )
        
        # Get the detection with highest confidence
        best_detection = max(detections, key=lambda d: d.confidence)
        
        # Fetch recycling information from external API
        recycling_info = await get_recycling_info(best_detection.category)
        
        # Calculate points earned
        points_earned = settings.POINTS_PER_RECYCLABLE if recycling_info and recycling_info.recyclable else 0
        
        # Save scan record to Firestore
        image_url = None
        if points_earned > 0:
            # Save the image for verified recyclables
            scan_id = str(uuid4())
            timestamp = datetime.utcnow()
            
            # Store the scan record
            await add_scan_record(
                user_id=user_id,
                scan_id=scan_id,
                timestamp=timestamp,
                image_url=image_url,
                detection=best_detection,
                recycling_info=recycling_info,
                points_earned=points_earned
            )
            
            # Update user's points
            await update_user_points(user_id, points_earned)
        
        return DetectionResponse(
            success=True,
            detection=best_detection,
            recycling_info=recycling_info,
            points_earned=points_earned
        )
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Detection failed: {str(e)}"
        )

@router.post("/detect-base64", response_model=DetectionResponse)
async def detect_image_base64(
    request: DetectionRequest,
    authorization: Optional[str] = Header(None),
    is_webcam_snapshot: bool = Form(True, description="Whether this is a snapshot from webcam stream"),
    client_confidence: Optional[float] = Form(None, description="Confidence level from client-side detection")
):
    """
    Process a base64 encoded image to detect recyclable objects.
    
    This endpoint accepts a base64 encoded image from a webcam stream 
    and performs the same detection process as the /detect endpoint.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
        # Ensure user_id matches token
        if user["uid"] != request.user_id:
            raise HTTPException(status_code=403, detail="User ID does not match token")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    # Decode the base64 image
    try:
        image_data = base64.b64decode(request.image)
        processed_image = process_image(image_data)
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Image processing failed: {str(e)}"
        )
    
    # Set confidence threshold - potentially use client confidence if provided
    confidence_threshold = settings.DETECTION_CONFIDENCE_THRESHOLD
    if is_webcam_snapshot and client_confidence is not None:
        logger.info(f"Client provided confidence: {client_confidence}")
        # Can implement logic to adjust server-side threshold based on client confidence
    
    # Run object detection
    try:
        detections = detect_objects(processed_image)
        
        # If no detections or below threshold
        if not detections or max(d.confidence for d in detections) < confidence_threshold:
            return DetectionResponse(
                success=True,
                detection=None,
                error_message="No recyclable items detected with sufficient confidence"
            )
        
        # Get the detection with highest confidence
        best_detection = max(detections, key=lambda d: d.confidence)
        
        # Fetch recycling information from external API
        recycling_info = await get_recycling_info(best_detection.category)
        
        # Calculate points earned
        points_earned = settings.POINTS_PER_RECYCLABLE if recycling_info and recycling_info.recyclable else 0
        
        # Save scan record to Firestore
        image_url = None
        if points_earned > 0:
            # Save the image for verified recyclables
            scan_id = str(uuid4())
            timestamp = datetime.utcnow()
            
            # Store the scan record
            await add_scan_record(
                user_id=request.user_id,
                scan_id=scan_id,
                timestamp=timestamp,
                image_url=image_url,
                detection=best_detection,
                recycling_info=recycling_info,
                points_earned=points_earned
            )
            
            # Update user's points
            await update_user_points(request.user_id, points_earned)
        
        return DetectionResponse(
            success=True,
            detection=best_detection,
            recycling_info=recycling_info,
            points_earned=points_earned
        )
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Detection failed: {str(e)}"
        )

@router.post("/continuous-detection", response_model=DetectionResponse)
async def continuous_detection(
    request: DetectionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Endpoint for continuous detection from a webcam stream.
    
    This endpoint is optimized for handling multiple frames from a webcam stream:
    - It can return quickly for low-confidence detections
    - Only performs full processing when confidence threshold is met
    - Can be called repeatedly as the user shows different items to the camera
    """
    # Verify Firebase token (lightweight verification for streaming)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        # Use a cached or simplified token verification for streaming
        user = await verify_firebase_token(token, lightweight=True)
        if user["uid"] != request.user_id:
            raise HTTPException(status_code=403, detail="User ID does not match token")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    # Process image
    try:
        image_data = base64.b64decode(request.image)
        processed_image = process_image(image_data, resize_for_streaming=True)
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Image processing failed: {str(e)}"
        )
    
    # Lightweight detection for streaming
    try:
        # Use a faster detection model or settings for streaming
        detections = detect_objects(processed_image, optimized_for_streaming=True)
        
        # If no detections or below threshold, return quickly
        if not detections or max(d.confidence for d in detections) < settings.DETECTION_CONFIDENCE_THRESHOLD:
            return DetectionResponse(
                success=True,
                detection=None,
                error_message=None  # No error, just no high-confidence detection yet
            )
        
        # High confidence detection found!
        best_detection = max(detections, key=lambda d: d.confidence)
        
        # Return immediately with detection info, but don't fetch external info yet
        # The frontend can then call the regular /detect endpoint with this frame
        # to get full processing and record the scan
        return DetectionResponse(
            success=True,
            detection=best_detection,
            recycling_info=None,  # Don't fetch external info yet
            points_earned=None    # Don't calculate points yet
        )
        
    except Exception as e:
        logger.error(f"Streaming detection error: {str(e)}")
        return DetectionResponse(
            success=False,
            error_message=f"Detection failed: {str(e)}"
        )