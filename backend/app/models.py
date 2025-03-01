from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RecyclableCategory(str, Enum):
    PLASTIC = "plastic"
    PAPER = "paper"
    GLASS = "glass"
    METAL = "metal"
    ELECTRONICS = "electronics"
    COMPOST = "compost"
    UNKNOWN = "unknown"

class DetectionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image data")
    user_id: str = Field(..., description="Firebase user ID")

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class Detection(BaseModel):
    category: RecyclableCategory
    confidence: float
    bounding_box: Optional[BoundingBox] = None
    
class RecyclingInfo(BaseModel):
    category: RecyclableCategory
    recyclable: bool
    description: str
    disposal_instructions: str
    environmental_impact: str
    additional_info: Optional[Dict[str, Any]] = None

class DetectionResponse(BaseModel):
    success: bool
    detection: Optional[Detection] = None
    recycling_info: Optional[RecyclingInfo] = None
    points_earned: Optional[int] = None
    error_message: Optional[str] = None

class ScanRecord(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    image_url: Optional[HttpUrl] = None
    detection: Detection
    recycling_info: RecyclingInfo
    points_earned: int

class UserScanHistory(BaseModel):
    user_id: str
    total_scans: int
    total_points: int
    scans: List[ScanRecord]

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_points: int
    total_scans: int
    rank: int

class Leaderboard(BaseModel):
    entries: List[LeaderboardEntry]
    total_users: int
    updated_at: datetime

class ErrorResponse(BaseModel):
    detail: str