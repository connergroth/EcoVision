from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()


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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# to run, do uvicorn app.dummyserver:app --reload