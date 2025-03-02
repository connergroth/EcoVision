from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.endpoints import detection, leaderboard, scans, websocket
from app.services.firebase_service import verify_firebase_token
from app.utils.logger import setup_logger

# Setup logger
logger = setup_logger()

app = FastAPI(
    title="EcoVision API",
    description="Backend API for the EcoVision application, providing image detection, user history, and leaderboard functionalities.",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",  # Local React/Next.js development server
    "https://ecovision.app", 
     "http://127.0.0.1:8000", # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers from endpoints
app.include_router(detection.router, prefix="/api/v1", tags=["Detection"])
app.include_router(scans.router, prefix="/api/v1", tags=["Scans"])
app.include_router(leaderboard.router, prefix="/api/v1", tags=["Leaderboard"])
app.include_router(websocket.router, tags=["WebSocket"])

@app.get("/")
async def root():
    return {"message": "Welcome to EcoVision API. See /docs for API documentation."}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring services"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting EcoVision API server")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)