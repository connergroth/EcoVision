from fastapi import APIRouter, Depends, HTTPException, Query, Header, Path
from typing import Optional, List
import logging
from datetime import datetime, timedelta

from app.models import UserScanHistory, ScanRecord
from app.services.firebase_service import verify_firebase_token, get_user_scans, get_scan_details
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/users/{user_id}/scans", response_model=UserScanHistory)
async def get_user_scan_history(
    user_id: str = Path(..., description="Firebase user ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of scans to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    start_date: Optional[datetime] = Query(None, description="Filter scans from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter scans until this date"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve a user's scan history with pagination and date filtering.
    
    Returns scan records including detected items, recycling information,
    and environmental impact points earned.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
        # Verify the user is requesting their own scans or has admin privileges
        if user["uid"] != user_id and not user.get("admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view this user's scans")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
    
    try:
        # Get user's scan history from Firestore
        scans_data = await get_user_scans(
            user_id=user_id,
            limit=limit,
            offset=offset,
            start_date=start_date,
            end_date=end_date
        )
        
        return UserScanHistory(
            user_id=user_id,
            total_scans=scans_data["total_scans"],
            total_points=scans_data["total_points"],
            scans=scans_data["scans"]
        )
    
    except Exception as e:
        logger.error(f"Error retrieving user scans: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scan history: {str(e)}")

@router.get("/scans/{scan_id}", response_model=ScanRecord)
async def get_scan_by_id(
    scan_id: str = Path(..., description="Unique scan record ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve detailed information about a specific scan.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    try:
        # Get scan details from Firestore
        scan_data = await get_scan_details(scan_id)
        
        # Check if the user is authorized to view this scan
        if scan_data["user_id"] != user["uid"] and not user.get("admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view this scan")
        
        return scan_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scan details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scan details: {str(e)}")

@router.get("/users/{user_id}/stats/summary")
async def get_user_stats_summary(
    user_id: str = Path(..., description="Firebase user ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Get a summary of the user's recycling statistics and environmental impact.
    """
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = await verify_firebase_token(token)
        # Verify the user is requesting their own stats or has admin privileges
        if user["uid"] != user_id and not user.get("admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to view this user's stats")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
    try:
        # Get user's scan history from Firestore for the last year
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)
        
        scans_data = await get_user_scans(
            user_id=user_id,
            limit=1000,  # High limit to get all scans within the date range
            offset=0,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate statistics
        category_counts = {}
        monthly_points = {}
        
        for scan in scans_data["scans"]:
            # Count by category
            category = scan.detection.category
            if category in category_counts:
                category_counts[category] += 1
            else:
                category_counts[category] = 1
            
            # Aggregate monthly points
            month_key = scan.timestamp.strftime("%Y-%m")
            if month_key in monthly_points:
                monthly_points[month_key] += scan.points_earned
            else:
                monthly_points[month_key] = scan.points_earned
        
        # Format monthly points for frontend chart
        monthly_points_list = [
            {"month": month, "points": points}
            for month, points in sorted(monthly_points.items())
        ]
        
        # Calculate environmental impact metrics (placeholder calculations)
        # These would be replaced with actual calculations based on your environmental model
        co2_saved_kg = scans_data["total_points"] * 0.25  # Example: 0.25kg CO2 saved per point
        water_saved_liters = scans_data["total_points"] * 10  # Example: 10L water saved per point
        trees_equivalent = co2_saved_kg / 20  # Example: 20kg CO2 absorbed per tree per year
        
        return {
            "user_id": user_id,
            "total_scans": scans_data["total_scans"],
            "total_points": scans_data["total_points"],
            "category_breakdown": [
                {"category": category, "count": count}
                for category, count in category_counts.items()
            ],
            "monthly_points": monthly_points_list,
            "environmental_impact": {
                "co2_saved_kg": round(co2_saved_kg, 2),
                "water_saved_liters": round(water_saved_liters, 2),
                "trees_equivalent": round(trees_equivalent, 2)
            },
            "streak_days": calculate_streak(scans_data["scans"]),
            "last_scan": scans_data["scans"][0].timestamp if scans_data["scans"] else None
        }
    
    except Exception as e:
        logger.error(f"Error retrieving user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user statistics: {str(e)}")

def calculate_streak(scans: List[ScanRecord]) -> int:
    """Calculate the user's current streak in days"""
    if not scans:
        return 0
    
    # Sort scans by timestamp (newest first)
    sorted_scans = sorted(scans, key=lambda x: x.timestamp, reverse=True)
    
    # Check if there's a scan today
    today = datetime.utcnow().date()
    latest_scan_date = sorted_scans[0].timestamp.date()
    
    if latest_scan_date < today - timedelta(days=1):
        # Streak broken if no scan yesterday or today
        return 0
    
    # Count consecutive days with scans
    streak = 1
    current_date = latest_scan_date
    date_set = {scan.timestamp.date() for scan in sorted_scans}
    
    while current_date - timedelta(days=1) in date_set:
        streak += 1
        current_date = current_date - timedelta(days=1)
    
    return streak