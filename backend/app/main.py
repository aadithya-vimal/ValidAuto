import os
import time
import numpy as np
from PIL import Image
from io import BytesIO
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Try importing standard tensorflow, fallback to local raw numpy emulator if not available (e.g. Python 3.14)
try:
    import tensorflow as tf
except ImportError:
    try:
        import tf_mock as tf
    except ImportError:
        from app import tf_mock as tf

app = FastAPI(
    title="Vehicle Damage Assessment API",
    description="Backend service for classifying vehicle damage from images and generating reports (Phase 3)",
    version="3.0.0"
)

# CORS configurations for communication with the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Model Variable
model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'vehicle_damage_model.h5')

# Pydantic schemas for Report Generation
class ReportRequest(BaseModel):
    damage: str
    severity: str
    confidence: float

@app.on_event("startup")
def load_trained_classifier():
    """
    Startup event hook to pre-load model weights into memory.
    """
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = tf.load_model(MODEL_PATH)
        else:
            print(f"[Warning] Model file not found at '{MODEL_PATH}'. Initializing a fallback default model.")
            # Initialize fallback model
            model = tf.Sequential()
            dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data1a'))
            train_dir = os.path.join(dataset_dir, 'training')
            if os.path.exists(train_dir):
                discovered_classes = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
            else:
                discovered_classes = []
            model.classes = discovered_classes
            num_classes = len(discovered_classes) if len(discovered_classes) > 0 else 2
            # Default mock random weights for 3072 features to classes
            model.weights = np.random.randn(3072, num_classes) * 0.001
            model.bias = np.zeros(num_classes)
    except Exception as e:
        print(f"[Error] Failed loading model: {e}. Starting with raw fallback.")
        model = tf.Sequential()
        dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data1a'))
        train_dir = os.path.join(dataset_dir, 'training')
        if os.path.exists(train_dir):
            discovered_classes = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
        else:
            discovered_classes = []
        model.classes = discovered_classes
        num_classes = len(discovered_classes) if len(discovered_classes) > 0 else 2
        model.weights = np.random.randn(3072, num_classes) * 0.001
        model.bias = np.zeros(num_classes)

@app.get("/health")
def health_check():
    """
    Health check endpoint to verify backend service status.
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "3.0.0",
        "model_loaded": model is not None
    }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Live analyze endpoint that accepts an image file, preprocesses it, runs classification,
    and returns damage type, confidence score, and calculated severity.
    """
    global model
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded on server.")

    # Simple validation on file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, 
            detail="File provided is not a valid image format."
        )

    try:
        # Read file bytes
        contents = await file.read()
        
        # Image Preprocessing: Load and Resize using PIL
        img = Image.open(BytesIO(contents)).convert('RGB')
        img_resized = img.resize((224, 224))
        
        # Convert to numpy array and normalize inputs to [0.0, 1.0]
        img_arr = np.array(img_resized, dtype=np.float32) / 255.0
        
        # Expand dims to represent batch input (1, 224, 224, 3)
        batch_input = np.expand_dims(img_arr, axis=0)

        # Model Inference: Run forward prediction pass
        start_time = time.time()
        predictions = model.predict(batch_input)  # Output array of size (1, 3)
        inference_time = time.time() - start_time

        # Extract predictions for batch item 0
        probs = predictions[0]
        pred_class_idx = int(np.argmax(probs))
        confidence = float(probs[pred_class_idx])
        damage_class = model.classes[pred_class_idx]

        # Map Confidence & Damage type to Severity thresholds
        is_whole = any(w in damage_class.lower() for w in ['whole', 'clean', 'none'])
        if is_whole:
            severity = "None"
        else:
            if confidence >= 0.80:
                severity = "High"
            elif confidence >= 0.50:
                severity = "Moderate"
            else:
                severity = "Low"

        # Return live structured model predictions
        return {
            "damage": damage_class,
            "confidence": round(confidence, 4),
            "severity": severity,
            "filename": file.filename,
            "inference_time_seconds": round(inference_time, 4)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error executing image analysis model: {str(e)}"
        )

@app.post("/report")
def generate_report(request: ReportRequest):
    """
    Local report generation endpoint mapping classifier parameters into natural-reading paragraphs.
    """
    from app.report import generate_report_dict
    try:
        report_data = generate_report_dict(
            damage_type=request.damage,
            severity=request.severity,
            confidence=request.confidence
        )
        return {"report": report_data}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating diagnostic report: {str(e)}"
        )
