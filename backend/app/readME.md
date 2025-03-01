# EcoVision API

A FastAPI backend for the EcoVision application, providing image detection, user history, and leaderboard functionalities.

## Features

- **Image Processing & Detection:** Process snapshots from webcam streams, run them through a pre-trained model (with NPU acceleration when available), and detect recyclable items.
- **External Information:** Fetch additional recycling information for detected items.
- **User Scan History:** Record scans in Firebase Firestore and maintain user environmental impact scores.
- **Leaderboard:** Track and display global environmental impact rankings.
- **Firebase Integration:** Secure authentication and data storage.

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration settings
│   ├── models.py                  # Pydantic data models
│   ├── endpoints/
│   │   ├── __init__.py
│   │   ├── detection.py           # Image detection endpoints
│   │   ├── leaderboard.py         # Leaderboard endpoints
│   │   └── scans.py               # User scan history endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── detection_service.py   # Image processing and model inference
│   │   ├── firebase_service.py    # Firebase authentication and database
│   │   ├── external_api.py        # External recycling information API
│   │   └── npu_service.py         # Neural Processing Unit acceleration
│   └── utils/
│       ├── __init__.py
│       └── logger.py              # Logging configuration
├── logs/                          # Log files directory
└── requirements.txt               # Python dependencies
```

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Firebase project with Firestore database
- Pre-trained detection model (based on SeegulL with modifications)

### Environment Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Create and activate a virtual environment
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your configuration
   ```
   # API Configuration
   DEBUG=True
   LOG_LEVEL=INFO
   
   # Detection Configuration
   DETECTION_CONFIDENCE_THRESHOLD=0.7
   MODEL_PATH=models/recycling_detection_model.pb
   ENABLE_NPU=True
   
   # Firebase Configuration
   FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
   FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
   
   # External API Configuration
   EXTERNAL_API_URL=https://api.recycleinfo.org/v1
   EXTERNAL_API_KEY=your-api-key
   
   # Environmental Impact Points
   POINTS_PER_RECYCLABLE=10
   ```

5. Place your Firebase service account key file in the project root as `firebase-service-account.json`

6. Place your pre-trained model in the `models/` directory

### Running the Server

Start the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Documentation

Once the server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Key Endpoints

- **POST /api/v1/detect**: Process an uploaded image for detection
- **POST /api/v1/detect-base64**: Process a base64-encoded image
- **POST /api/v1/continuous-detection**: Optimized endpoint for webcam stream processing
- **GET /api/v1/users/{user_id}/scans**: Get a user's scan history
- **GET /api/v1/users/{user_id}/stats/summary**: Get a user's environmental impact statistics
- **GET /api/v1/leaderboard**: Get the global environmental impact leaderboard
- **GET /api/v1/leaderboard/user-rank/{user_id}**: Get a specific user's rank

## Integration with Frontend

The backend is designed to work with a React/Next.js frontend that:
1. Captures webcam stream
2. Processes frames with OpenCV
3. Sends high-confidence frames to backend for verification
4. Displays detection results in a modal
5. Shows user's scan history and environmental impact

## NPU Acceleration

The backend automatically detects and utilizes available Neural Processing Units (NPUs):
- Google Edge TPU
- Apple Neural Engine
- Android NNAPI
- Intel Neural Compute Stick
- GPU acceleration as fallback

