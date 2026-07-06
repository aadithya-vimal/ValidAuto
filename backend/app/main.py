import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Vehicle Damage Assessment API",
    description="Backend service for assessing vehicle damage from images (Phase 1 Mock)",
    version="1.0.0"
)

# CORS configurations for communication with the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """
    Health check endpoint to verify backend service status.
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Dummy analyze endpoint that accepts an image file and returns mock damage assessment reports.
    """
    # Simple validation on file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, 
            detail="File provided is not a valid image format."
        )

    # Read/process mock latency (1.5 seconds) to simulate analysis
    time.sleep(1.5)

    return {
        "filename": file.filename,
        "damage_detected": True,
        "overall_severity": "Moderate",
        "confidence_score": 0.89,
        "parts_damaged": [
            {
                "part": "Front Bumper",
                "severity": "Moderate",
                "confidence": 0.92,
                "description": "Dented and scraped on the front-left section. Paint peeling observed."
            },
            {
                "part": "Left Headlight",
                "severity": "High",
                "confidence": 0.95,
                "description": "Cracked lens housing, internal damage to LED bulb assembly."
            },
            {
                "part": "Left Front Fender",
                "severity": "Low",
                "confidence": 0.78,
                "description": "Minor surface scratches and paint transfer."
            }
        ],
        "repair_estimate": {
            "min_cost": 1200,
            "max_cost": 1800,
            "currency": "USD",
            "suggested_action": "Requires partial bumper replacement and headlight unit swap."
        },
        "timestamp": time.time()
    }
