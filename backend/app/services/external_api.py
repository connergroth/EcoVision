import aiohttp
import json
import logging
from typing import Dict, Optional, Any

from app.models import RecyclableCategory, RecyclingInfo
from app.config import settings
from app.utils.logger import get_logger

# Import the LLaMA service
from app.services.llama_service import get_llama_recycling_info

logger = get_logger(__name__)

# Cache for recycling information to reduce API calls
recycling_info_cache = {}

async def get_recycling_info(category: RecyclableCategory, confidence: float = 0.0) -> Optional[RecyclingInfo]:
    """
    Fetch additional information about a recyclable item.
    
    This function will first try to get enhanced information from the LLaMA model if enabled,
    then fall back to the external API, and finally use fallback information if both fail.
    
    Args:
        category: The detected recyclable category
        confidence: The confidence score of the detection
    
    Returns:
        RecyclingInfo object with details or None if all sources fail
    """
    # Check cache first
    cache_key = f"{category}-{confidence:.2f}"
    if cache_key in recycling_info_cache:
        logger.info(f"Using cached recycling info for {category}")
        return recycling_info_cache[cache_key]
    
    # Try to use LLaMA-enhanced information if enabled
    if settings.USE_LLAMA_ENHANCED_INFO and confidence > 0:
        try:
            llama_info = await get_llama_recycling_info(category, confidence)
            if llama_info:
                # Convert dictionary to RecyclingInfo
                recycling_info = RecyclingInfo(
                    category=category,
                    recyclable=llama_info.get("recyclable", True),
                    description=llama_info.get("description", ""),
                    disposal_instructions=llama_info.get("disposal_instructions", ""),
                    environmental_impact=llama_info.get("environmental_impact", ""),
                    additional_info=llama_info.get("additional_info", {"source": "LLaMA AI"})
                )
                
                # Cache the result
                recycling_info_cache[cache_key] = recycling_info
                
                logger.info(f"Using LLaMA-enhanced info for {category}")
                return recycling_info
        except Exception as e:
            logger.error(f"Error getting LLaMA-enhanced info: {e}")
            # Continue to fallback sources
    
    # Try external API if LLaMA failed or is disabled
    try:
        # Prepare API endpoint and parameters
        api_url = f"{settings.EXTERNAL_API_URL}/recyclable-info"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.EXTERNAL_API_KEY}"
        }
        params = {
            "category": category.value
        }
        
        # Make API request
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, headers=headers, params=params) as response:
                if response.status != 200:
                    logger.warning(f"External API returned status {response.status}: {await response.text()}")
                    return _get_fallback_info(category)
                
                # Parse response
                data = await response.json()
                
                # Map API response to RecyclingInfo model
                recycling_info = RecyclingInfo(
                    category=category,
                    recyclable=data.get("recyclable", True),
                    description=data.get("description", ""),
                    disposal_instructions=data.get("disposal_instructions", ""),
                    environmental_impact=data.get("environmental_impact", ""),
                    additional_info=data.get("additional_info", {})
                )
                
                # Cache the result
                recycling_info_cache[cache_key] = recycling_info
                
                return recycling_info
                
    except Exception as e:
        logger.error(f"Error fetching recycling info: {e}")
        return _get_fallback_info(category)

def _get_fallback_info(category: RecyclableCategory) -> RecyclingInfo:
    """
    Provide fallback information when external sources are unavailable.
    
    Args:
        category: The detected recyclable category
    
    Returns:
        RecyclingInfo with basic fallback information
    """
    # Default information by category
    fallback_info = {
        RecyclableCategory.PLASTIC: {
            "recyclable": True,
            "description": "Plastic items like bottles, containers, and packaging.",
            "disposal_instructions": "Rinse clean and place in recycling bin. Check local guidelines for plastic types accepted.",
            "environmental_impact": "Recycling plastic reduces landfill waste and saves energy compared to making new plastic."
        },
        RecyclableCategory.PAPER: {
            "recyclable": True,
            "description": "Paper products including cardboard, newspaper, and office paper.",
            "disposal_instructions": "Keep dry and clean. Remove tape, staples, and excessive contamination.",
            "environmental_impact": "Recycling paper saves trees, water, and energy while reducing greenhouse gas emissions."
        },
        RecyclableCategory.GLASS: {
            "recyclable": True,
            "description": "Glass bottles and jars of various colors.",
            "disposal_instructions": "Rinse clean and separate by color if required locally. Remove caps and lids.",
            "environmental_impact": "Glass can be recycled indefinitely without loss of quality, saving raw materials and energy."
        },
        RecyclableCategory.METAL: {
            "recyclable": True,
            "description": "Metal items including aluminum cans, steel cans, and foil.",
            "disposal_instructions": "Rinse clean and crush cans to save space if possible.",
            "environmental_impact": "Recycling metals saves significant energy compared to mining and refining new metal."
        },
        RecyclableCategory.ELECTRONICS: {
            "recyclable": True,
            "description": "Electronic devices, batteries, and accessories.",
            "disposal_instructions": "Take to designated e-waste recycling centers. Do not place in regular recycling bins.",
            "environmental_impact": "Proper recycling of electronics recovers valuable materials and prevents toxic components from entering landfills."
        },
        RecyclableCategory.COMPOST: {
            "recyclable": True,
            "description": "Organic waste suitable for composting.",
            "disposal_instructions": "Place in composting bin or dedicated green waste collection.",
            "environmental_impact": "Composting diverts waste from landfills and creates nutrient-rich soil amendments."
        },
        RecyclableCategory.UNKNOWN: {
            "recyclable": False,
            "description": "Item of unknown or mixed materials.",
            "disposal_instructions": "Check local guidelines or contact waste management for proper disposal.",
            "environmental_impact": "Proper sorting and disposal helps maximize recycling efficiency."
        }
    }
    
    # Get info for category or use unknown as fallback
    info = fallback_info.get(category, fallback_info[RecyclableCategory.UNKNOWN])
    
    return RecyclingInfo(
        category=category,
        recyclable=info["recyclable"],
        description=info["description"],
        disposal_instructions=info["disposal_instructions"],
        environmental_impact=info["environmental_impact"],
        additional_info={"source": "fallback", "reliability": "medium"}
    )

async def get_recycling_tips() -> Dict[str, Any]:
    """
    Fetch general recycling tips and best practices.
    
    Returns:
        Dictionary with recycling tips
    """
    api_url = f"{settings.EXTERNAL_API_URL}/recycling-tips"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.EXTERNAL_API_KEY}"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, headers=headers) as response:
                if response.status != 200:
                    logger.warning(f"External API returned status {response.status}: {await response.text()}")
                    return _get_fallback_tips()
                
                # Parse response
                data = await response.json()
                return data
                
    except Exception as e:
        logger.error(f"Error fetching recycling tips: {e}")
        return _get_fallback_tips()

def _get_fallback_tips() -> Dict[str, Any]:
    """
    Provide fallback recycling tips when the external API is unavailable.
    
    Returns:
        Dictionary with basic recycling tips
    """
    return {
        "general_tips": [
            "Rinse containers before recycling to remove food residue",
            "Remove caps and lids as they may be made of different materials",
            "Flatten cardboard boxes to save space",
            "Check local guidelines as recycling rules vary by location",
            "Avoid putting non-recyclable items in recycling bins"
        ],
        "common_mistakes": [
            "Recycling greasy or food-stained paper and cardboard",
            "Including plastic bags with regular recycling",
            "Not emptying and rinsing containers",
            "Recycling items smaller than a credit card (too small for processing)",
            "Including materials that require special handling (e-waste, batteries)"
        ],
        "environmental_facts": [
            "Recycling one aluminum can saves enough energy to run a TV for three hours",
            "The average American produces about 4.5 pounds of waste per day",
            "It takes 500 years for an average plastic water bottle to decompose",
            "Recycling paper saves 17 trees and 7,000 gallons of water per ton",
            "Glass can be recycled indefinitely without losing quality or purity"
        ]
    }