from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import random
import time

app = FastAPI(title="Machodoc ML Service")

class PredictionResult(BaseModel):
    confidence: float
    label: str
    details: dict

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-models"}

@app.post("/predict/audio", response_model=PredictionResult)
async def predict_audio(file: UploadFile = File(...)):
    # Simulate processing time
    time.sleep(1)
    
    # Mock logic: Return positive result if filename contains "pos"
    is_positive = "pos" in file.filename.lower()
    
    return {
        "confidence": 0.85 if is_positive else 0.92,
        "label": "Abnormal Respiratory Pattern" if is_positive else "Normal Breath Sounds",
        "details": {
            "wheeze_detected": is_positive,
            "crackles_detected": False,
            "respiratory_rate": random.randint(12, 20)
        }
    }

@app.post("/predict/image", response_model=PredictionResult)
async def predict_image(file: UploadFile = File(...), type: str = "skin"):
    # Simulate processing time
    time.sleep(1.5)
    
    return {
        "confidence": 0.78,
        "label": "Dermatitis" if type == "skin" else "Analysis Complete",
        "details": {
            "severity": "mild",
            "area_percentage": 15.5
        }
    }

@app.post("/predict/symptoms")
async def analyze_symptoms(symptoms: List[str]):
    return {
        "possible_conditions": [
            {"condition": "Common Cold", "probability": 0.6},
            {"condition": "Seasonal Allergies", "probability": 0.3}
        ],
        "recommendation": "Monitor symptoms for 24 hours."
    }
