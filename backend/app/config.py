import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "RecycleVision API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Detection Configuration
    DETECTION_CONFIDENCE_THRESHOLD: float = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.7"))
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/recycling_detection_model.pb")
    ENABLE_NPU: bool = os.getenv("ENABLE_NPU", "True").lower() == "true"
    
    # Firebase Configuration
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    FIREBASE_DATABASE_URL: str = os.getenv("FIREBASE_DATABASE_URL", "https://recyclevision-app.firebaseio.com")
    
    # External API Configuration
    EXTERNAL_API_URL: str = os.getenv("EXTERNAL_API_URL", "https://api.recycleinfo.org/v1")
    EXTERNAL_API_KEY: str = os.getenv("EXTERNAL_API_KEY", "")
    
    # Image Processing
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", "1024"))  # Maximum image dimension
    
    # Environmental Impact Points
    POINTS_PER_RECYCLABLE: int = int(os.getenv("POINTS_PER_RECYCLABLE", "10"))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()