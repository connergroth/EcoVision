import aiohttp
import logging
import time
import asyncio
from typing import Dict, Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from ratelimit import limits, RateLimitException

from app.models import RecyclableCategory, RecyclingInfo
from app.config import settings
from app.utils.environment import get_env_or_default
from app.utils.logger import get_logger

logger = get_logger(__name__)

class LlamaService:
    """Service for interacting with LLaMA model API (Ollama) to generate recycling information."""
    
    def __init__(self):
        self.api_url = settings.LLAMA_API_URL
        self.api_key = settings.LLAMA_API_KEY
        self.model_name = settings.LLAMA_MODEL_NAME
        self.max_tokens = settings.LLAMA_MAX_TOKENS
        self.rate_limit = get_env_or_default("LLAMA_API_RATE_LIMIT", 100)  # requests per minute
        
        # Determine if we're using Ollama
        self.is_ollama = "ollama" in self.api_url or "11434" in self.api_url
        logger.info(f"LlamaService initialized with {'Ollama' if self.is_ollama else 'standard LLaMA'} API")
        
        # Cache results to reduce API calls
        self.cache = {}
        
        # Rate limiting counter
        self.last_request_time = 0
        self.request_count = 0
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((RateLimitException, aiohttp.ClientError, asyncio.TimeoutError))
    )
    @limits(calls=1, period=1)  # Maximum 1 call per second
    async def _call_llama_api(self, prompt: str) -> Optional[str]:
        """
        Make a rate-limited API call to the LLaMA service.
        
        Args:
            prompt: The prompt to send to the LLaMA model
            
        Returns:
            The generated text or None if the call fails
        """
        # Apply rate limiting
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        # Reset counter if a minute has passed
        if elapsed > 60:
            self.request_count = 0
            self.last_request_time = current_time
        
        # Check if we've hit the rate limit
        if self.request_count >= self.rate_limit:
            seconds_to_wait = 60 - elapsed
            if seconds_to_wait > 0:
                logger.warning(f"Rate limit reached. Waiting for {seconds_to_wait:.1f} seconds")
                raise RateLimitException("LLaMA API rate limit reached", period=seconds_to_wait)
        
        # Track the request
        self.request_count += 1
        self.last_request_time = current_time if self.request_count == 1 else self.last_request_time
        
        # Make the API call
        async with aiohttp.ClientSession() as session:
            # Prepare headers - only add Authorization if API key exists
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            # Prepare payload based on API type (Ollama vs standard LLaMA API)
            if self.is_ollama:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "max_tokens": self.max_tokens
                    }
                }
            else:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "max_tokens": self.max_tokens,
                    "temperature": 0.7
                }
            
            logger.debug(f"Calling LLaMA API with model: {self.model_name}")
            
            try:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30  # 30 second timeout for Ollama
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.warning(f"LLaMA API returned status {response.status}: {error_text}")
                        
                        # Detect rate limiting errors from API provider
                        if response.status == 429:
                            raise RateLimitException("LLaMA API provider rate limit", period=30)
                        
                        return None
                    
                    # Parse response based on API type
                    data = await response.json()
                    
                    if self.is_ollama:
                        # Ollama response format: {"response": "generated text", "model": "..."}
                        return data.get("response", "")
                    else:
                        # Standard LLaMA API format
                        return data.get("generation", "")
            except aiohttp.ClientError as e:
                logger.error(f"HTTP error when calling LLaMA API: {e}")
                raise
            except asyncio.TimeoutError:
                logger.error("Timeout when calling LLaMA API")
                raise
            except Exception as e:
                logger.error(f"Unexpected error when calling LLaMA API: {e}")
                return None
    
    async def generate_recycling_info(self, 
                                     category: RecyclableCategory, 
                                     confidence: float) -> Optional[Dict[str, Any]]:
        """
        Generate detailed recycling information based on detected category using LLaMA.
        
        Args:
            category: The detected recyclable category
            confidence: The confidence score of the detection
            
        Returns:
            Dictionary with generated information or None if generation failed
        """
        # Check cache first
        cache_key = f"{category.value}_{int(confidence * 100)}"
        if cache_key in self.cache:
            logger.info(f"Using cached LLaMA generation for {category}")
            return self.cache[cache_key]
        
        # Prepare prompt template
        prompt = self._create_prompt(category, confidence)
        
        try:
            # Call LLaMA API with retry and rate limiting
            generated_text = await self._call_llama_api(prompt)
            
            if not generated_text:
                logger.warning(f"Empty or failed response from LLaMA API for {category}")
                return None
                
            # Process generated text to extract structured information
            parsed_info = self._parse_generation(generated_text, category)
            
            # Cache the result
            self.cache[cache_key] = parsed_info
            
            return parsed_info
                
        except Exception as e:
            logger.error(f"Error calling LLaMA API: {e}")
            return None
    
    def _create_prompt(self, category: RecyclableCategory, confidence: float) -> str:
        """Create a prompt for the LLaMA model based on the detected category."""
        return f"""
You are an expert on recycling and environmental sustainability. 
A recycling detection system has identified an item as {category.value.upper()} with {confidence*100:.1f}% confidence.

Provide detailed information about this recyclable category in the following format:
1. Description of the material (what it is and common items made from it)
2. Whether it's generally recyclable and any specific conditions
3. Proper disposal instructions and how to prepare it for recycling
4. Environmental impact of recycling this material vs. sending to landfill
5. Interesting facts about recycling this material

Your response should be informative, accurate, and encourage proper recycling practices.
"""
    
    def _parse_generation(self, text: str, category: RecyclableCategory) -> Dict[str, Any]:
        """Parse the generated text into structured information."""
        # Simple parsing strategy (can be enhanced with more sophisticated parsing)
        lines = text.split('\n')
        
        # Default values
        description = ""
        recyclable = True
        disposal_instructions = ""
        environmental_impact = ""
        additional_info = {"interesting_facts": [], "source": "LLaMA AI"}
        
        # Extract sections using simple heuristics
        current_section = 0
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for section markers
            if "1." in line and "description" in line.lower():
                current_section = 1
                continue
            elif "2." in line and "recyclable" in line.lower():
                current_section = 2
                continue
            elif "3." in line and ("disposal" in line.lower() or "instructions" in line.lower()):
                current_section = 3
                continue
            elif "4." in line and "environmental" in line.lower():
                current_section = 4
                continue
            elif "5." in line and "facts" in line.lower():
                current_section = 5
                continue
                
            # Process content based on current section
            if current_section == 1:
                description += line + " "
            elif current_section == 2:
                # Check if the material is described as recyclable
                if "not recyclable" in line.lower() or "non-recyclable" in line.lower():
                    recyclable = False
                # Capture the full text in the description
                description += line + " "
            elif current_section == 3:
                disposal_instructions += line + " "
            elif current_section == 4:
                environmental_impact += line + " "
            elif current_section == 5:
                if line.startswith("- ") or line.startswith("* "):
                    additional_info["interesting_facts"].append(line[2:])
                else:
                    additional_info["interesting_facts"].append(line)
        
        # Clean up and format
        return {
            "category": category,
            "recyclable": recyclable,
            "description": description.strip(),
            "disposal_instructions": disposal_instructions.strip(),
            "environmental_impact": environmental_impact.strip(),
            "additional_info": additional_info
        }

# Initialize a global instance
llama_service = LlamaService()

async def get_llama_recycling_info(category: RecyclableCategory, confidence: float) -> Optional[Dict[str, Any]]:
    """
    Get enhanced recycling information from LLaMA model.
    
    Wrapper around the LlamaService for easier imports.
    
    Args:
        category: Detected recyclable category
        confidence: Detection confidence score
        
    Returns:
        Enhanced information or None if generation failed
    """
    return await llama_service.generate_recycling_info(category, confidence)