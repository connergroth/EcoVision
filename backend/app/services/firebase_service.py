import firebase_admin
from firebase_admin import credentials, auth, firestore, storage
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json
from uuid import uuid4

from app.config import settings
from app.models import ScanRecord, Detection, RecyclingInfo
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Initialize Firebase - done once at module level
try:
    cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
    firebase_app = firebase_admin.initialize_app(cred, {
        'databaseURL': settings.FIREBASE_DATABASE_URL,
        'storageBucket': settings.FIREBASE_DATABASE_URL.replace('https://', '')
    })
    db = firestore.client()
    bucket = storage.bucket()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    db = None
    bucket = None

# Token cache to reduce verification overhead on continuous requests
# Format: {token: {'user': user_data, 'expires': timestamp}}
token_cache = {}

async def verify_firebase_token(token: str, lightweight: bool = False) -> Dict:
    """
    Verify a Firebase ID token and return the user information.
    
    Args:
        token: Firebase ID token from client
        lightweight: If True, use cached results when available for better performance
    
    Returns:
        Dict containing user information
    
    Raises:
        HTTPException: If token verification fails
    """
    if not token:
        raise ValueError("No token provided")
    
    # Check cache for lightweight requests (useful for continuous detection)
    if lightweight and token in token_cache:
        cache_entry = token_cache[token]
        if cache_entry['expires'] > datetime.now():
            return cache_entry['user']
    
    try:
        # Verify token with Firebase
        decoded_token = auth.verify_id_token(token)
        
        # Get additional user info if needed
        user_record = auth.get_user(decoded_token['uid'])
        
        # Create user info dict
        user_info = {
            'uid': user_record.uid,
            'email': user_record.email,
            'display_name': user_record.display_name,
            'photo_url': user_record.photo_url,
            'custom_claims': decoded_token.get('claims', {})
        }
        
        # Cache token for lightweight requests
        token_cache[token] = {
            'user': user_info,
            'expires': datetime.now() + timedelta(minutes=5)  # Cache for 5 minutes
        }
        
        return user_info
        
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise ValueError(f"Invalid or expired token: {e}")

async def add_scan_record(
    user_id: str,
    scan_id: str,
    timestamp: datetime,
    image_url: Optional[str],
    detection: Detection,
    recycling_info: RecyclingInfo,
    points_earned: int
) -> str:
    """
    Add a scan record to Firestore and update user stats.
    
    Args:
        user_id: Firebase user ID
        scan_id: Unique ID for this scan
        timestamp: When the scan occurred
        image_url: Optional URL to the saved image
        detection: The detection result
        recycling_info: Information about the detected item
        points_earned: Environmental impact points earned
    
    Returns:
        The scan ID
    """
    if not db:
        raise ValueError("Firebase Firestore not initialized")
    
    try:
        # Convert pydantic models to dictionaries
        detection_dict = detection.dict()
        recycling_info_dict = recycling_info.dict()
        
        # Create scan record
        scan_data = {
            'id': scan_id,
            'user_id': user_id,
            'timestamp': timestamp,
            'image_url': image_url,
            'detection': detection_dict,
            'recycling_info': recycling_info_dict,
            'points_earned': points_earned
        }
        
        # Add record to user's scans collection
        db.collection('users').document(user_id).collection('scans').document(scan_id).set(scan_data)
        
        # Add to global scans collection (useful for admins/analytics)
        db.collection('scans').document(scan_id).set(scan_data)
        
        # Update user's stats document
        user_ref = db.collection('users').document(user_id)
        user_stats_ref = user_ref.collection('stats').document('recycling')
        
        # Try to update existing stats
        stats_doc = user_stats_ref.get()
        if stats_doc.exists:
            user_stats_ref.update({
                'total_points': firestore.Increment(points_earned),
                'total_scans': firestore.Increment(1),
                'last_scan_timestamp': timestamp,
                f'category_counts.{detection.category}': firestore.Increment(1)
            })
        else:
            # Create new stats document
            user_stats_ref.set({
                'total_points': points_earned,
                'total_scans': 1,
                'last_scan_timestamp': timestamp,
                'category_counts': {
                    detection.category: 1
                },
                'created_at': timestamp
            })
        
        logger.info(f"Added scan record {scan_id} for user {user_id}")
        return scan_id
        
    except Exception as e:
        logger.error(f"Error adding scan record: {e}")
        raise ValueError(f"Failed to add scan record: {e}")

async def update_user_points(user_id: str, points: int) -> int:
    """
    Update a user's environmental impact points.
    
    Args:
        user_id: Firebase user ID
        points: Points to add
    
    Returns:
        New total points
    """
    if not db:
        raise ValueError("Firebase Firestore not initialized")
    
    try:
        # Update user document
        user_ref = db.collection('users').document(user_id)
        
        # Get current user data
        user_doc = user_ref.get()
        current_points = 0
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            current_points = user_data.get('environmental_points', 0)
            
            # Update points
            user_ref.update({
                'environmental_points': current_points + points,
                'last_activity': datetime.utcnow()
            })
        else:
            # Create new user document
            current_points = points
            user_ref.set({
                'user_id': user_id,
                'environmental_points': points,
                'created_at': datetime.utcnow(),
                'last_activity': datetime.utcnow()
            })
        
        # Update leaderboard entry
        leaderboard_ref = db.collection('leaderboard').document(user_id)
        
        # Get username from auth
        try:
            user_record = auth.get_user(user_id)
            username = user_record.display_name or f"User {user_id[:5]}"
        except:
            username = f"User {user_id[:5]}"
        
        # Update or create leaderboard entry
        leaderboard_ref.set({
            'user_id': user_id,
            'username': username,
            'total_points': current_points + points,
            'last_updated': datetime.utcnow()
        }, merge=True)
        
        return current_points + points
        
    except Exception as e:
        logger.error(f"Error updating user points: {e}")
        raise ValueError(f"Failed to update user points: {e}")

async def get_user_scans(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Get a user's scan history with pagination and date filtering.
    
    Args:
        user_id: Firebase user ID
        limit: Number of scans to return
        offset: Pagination offset
        start_date: Filter scans from this date
        end_date: Filter scans until this date
    
    Returns:
        Dict with scan history and stats
    """
    if not db:
        raise ValueError("Firebase Firestore not initialized")
    
    try:
        # Get user stats
        stats_ref = db.collection('users').document(user_id).collection('stats').document('recycling')
        stats_doc = stats_ref.get()
        
        total_scans = 0
        total_points = 0
        
        if stats_doc.exists:
            stats = stats_doc.to_dict()
            total_scans = stats.get('total_scans', 0)
            total_points = stats.get('total_points', 0)
        
        # Query user's scans
        scans_query = db.collection('users').document(user_id).collection('scans')
        
        # Apply date filters if provided
        if start_date:
            scans_query = scans_query.where('timestamp', '>=', start_date)
        if end_date:
            scans_query = scans_query.where('timestamp', '<=', end_date)
        
        # Order by timestamp (newest first)
        scans_query = scans_query.order_by('timestamp', direction=firestore.Query.DESCENDING)
        
        # Apply pagination
        scans_query = scans_query.limit(limit).offset(offset)
        
        # Execute query
        scan_docs = scans_query.stream()
        
        # Convert to ScanRecord model instances
        scans = []
        for doc in scan_docs:
            scan_data = doc.to_dict()
            
            # Convert dictionary to ScanRecord model
            scan_record = ScanRecord(
                id=scan_data['id'],
                user_id=scan_data['user_id'],
                timestamp=scan_data['timestamp'],
                image_url=scan_data.get('image_url'),
                detection=Detection(**scan_data['detection']),
                recycling_info=RecyclingInfo(**scan_data['recycling_info']),
                points_earned=scan_data['points_earned']
            )
            
            scans.append(scan_record)
        
        return {
            'total_scans': total_scans,
            'total_points': total_points,
            'scans': scans
        }
        
    except Exception as e:
        logger.error(f"Error retrieving user scans: {e}")
        raise ValueError(f"Failed to retrieve scan history: {e}")

async def get_scan_details(scan_id: str) -> ScanRecord:
    """
    Get detailed information about a specific scan.
    
    Args:
        scan_id: Scan record ID
    
    Returns:
        ScanRecord object
    """
    if not db:
        raise ValueError("Firebase Firestore not initialized")
    
    try:
        # Get scan document
        scan_ref = db.collection('scans').document(scan_id)
        scan_doc = scan_ref.get()
        
        if not scan_doc.exists:
            raise ValueError(f"Scan {scan_id} not found")
        
        scan_data = scan_doc.to_dict()
        
        # Convert to ScanRecord model
        scan_record = ScanRecord(
            id=scan_data['id'],
            user_id=scan_data['user_id'],
            timestamp=scan_data['timestamp'],
            image_url=scan_data.get('image_url'),
            detection=Detection(**scan_data['detection']),
            recycling_info=RecyclingInfo(**scan_data['recycling_info']),
            points_earned=scan_data['points_earned']
        )
        
        return scan_record
        
    except Exception as e:
        logger.error(f"Error retrieving scan details: {e}")
        raise ValueError(f"Failed to retrieve scan details: {e}")

async def get_leaderboard(limit: int = 10, offset: int = 0) -> Dict[str, Any]:
    """
    Get the global environmental impact leaderboard.
    
    Args:
        limit: Number of top users to return
        offset: Pagination offset
    
    Returns:
        Dict with leaderboard entries and total count
    """
    if not db:
        raise ValueError("Firebase Firestore not initialized")
    
    try:
        # Query leaderboard collection
        leaderboard_query = (
            db.collection('leaderboard')
            .order_by('total_points', direction=firestore.Query.DESCENDING)
            .limit(limit)
            .offset(offset)
        )
        
        # Execute query
        leaderboard_docs = leaderboard_query.stream()
        
        # Count total users
        total_users_query = db.collection('leaderboard').count()
        total_users_result = total_users_query.get()
        total_users = total_users_result[0][0].value
        
        # Convert to list of dictionaries
        users = []
        for doc in leaderboard_docs:
            user_data = doc.to_dict()
            
            # Get scan count for user
            try:
                stats_ref = db.collection('users').document(user_data['user_id']).collection('stats').document('recycling')
                stats_doc = stats_ref.get()
                
                if stats_doc.exists:
                    stats = stats_doc.to_dict()
                    total_scans = stats.get('total_scans', 0)
                else:
                    total_scans = 0
            except:
                total_scans = 0
            
            users.append({
                'user_id': user_data['user_id'],
                'username': user_data.get('username', f"User {user_data['user_id'][:5]}"),
                'total_points': user_data.get('total_points', 0),
                'total_scans': total_scans
            })
        
        return {
            'users': users,
            'total_users': total_users
        }
        
    except Exception as e:
        logger.error(f"Error retrieving leaderboard: {e}")
        raise ValueError(f"Failed to retrieve leaderboard: {e}")