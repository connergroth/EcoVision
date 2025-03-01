from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional, List
import logging
from datetime import datetime

from app.models import Leaderboard, LeaderboardEntry
from app.services.firebase_service import verify_firebase_token, get_leaderboard
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/leaderboard", response_model=Leaderboard)
async def get_global_leaderboard(
    limit: int = Query(10, ge=1, le=100, description="Number of top users to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve the global environmental impact leaderboard.
    
    Returns the top users ranked by environmental impact points
    with pagination support.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        await verify_firebase_token(token)
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    try:
        # Get leaderboard data from Firestore
        leaderboard_data = await get_leaderboard(limit, offset)
        
        # Format the response
        entries = []
        for i, user_data in enumerate(leaderboard_data["users"], start=offset+1):
            entries.append(
                LeaderboardEntry(
                    user_id=user_data["user_id"],
                    username=user_data["username"],
                    total_points=user_data["total_points"],
                    total_scans=user_data["total_scans"],
                    rank=i
                )
            )
        
        return Leaderboard(
            entries=entries,
            total_users=leaderboard_data["total_users"],
            updated_at=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Error retrieving leaderboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve leaderboard: {str(e)}")

@router.get("/leaderboard/user-rank/{user_id}")
async def get_user_rank(
    user_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve a specific user's rank on the leaderboard.
    
    Returns the user's position, points, and relevant statistics
    compared to other users.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
        # Verify the user is requesting their own rank or has admin privileges
        if user["uid"] != user_id and not user.get("admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view this user's rank")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    try:
        # Get user's rank from Firestore
        # This would typically require a custom query or calculation
        leaderboard_data = await get_leaderboard(1000, 0)  # Get a large chunk to find the user
        
        # Find the user in the leaderboard
        user_entry = None
        user_rank = 0
        
        for i, entry in enumerate(leaderboard_data["users"], start=1):
            if entry["user_id"] == user_id:
                user_entry = entry
                user_rank = i
                break
        
        if not user_entry:
            return {
                "user_id": user_id,
                "rank": "Not ranked",
                "total_points": 0,
                "total_scans": 0,
                "total_users": leaderboard_data["total_users"]
            }
        
        return {
            "user_id": user_id,
            "rank": user_rank,
            "total_points": user_entry["total_points"],
            "total_scans": user_entry["total_scans"],
            "username": user_entry["username"],
            "total_users": leaderboard_data["total_users"],
            "percentile": round((1 - (user_rank / leaderboard_data["total_users"])) * 100, 1)
        }
    
    except Exception as e:
        logger.error(f"Error retrieving user rank: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user rank: {str(e)}")