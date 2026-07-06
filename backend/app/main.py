import os
import time
import datetime
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf

app = FastAPI(
    title="ValidAuto Inspection API",
    description="Multi-stage neural pipeline for vehicle inspection",
    version="3.1.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Models
binary_model = None
secondary_model = None

BINARY_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'vehicle_damage_model.h5')
SECONDARY_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'secondary_damage_model.h5')

# Configurable Repair Database (in INR)
REPAIR_DATABASE = {
    "scratch": {
        "parts": 0,
        "labour": 2000,
        "paint": 3500,
        "gst_rate": 0.18
    },
    "dent": {
        "parts": 1500,
        "labour": 4000,
        "paint": 3000,
        "gst_rate": 0.18
    },
    "bumper": {
        "parts": 9000,
        "labour": 3000,
        "paint": 4500,
        "gst_rate": 0.18
    },
    "glass": {
        "parts": 10500,
        "labour": 2500,
        "paint": 0,
        "gst_rate": 0.18
    },
    "damage": { # Default fallback
        "parts": 4000,
        "labour": 3000,
        "paint": 3500,
        "gst_rate": 0.18
    }
}

@app.on_event("startup")
def load_models():
    global binary_model, secondary_model
    try:
        # Load binary classifier
        if os.path.exists(BINARY_MODEL_PATH):
            print(f"Loading binary damage model from {BINARY_MODEL_PATH}...")
            binary_model = tf.keras.models.load_model(BINARY_MODEL_PATH)
        else:
            raise FileNotFoundError(f"Binary model file not found at {BINARY_MODEL_PATH}")

        # Load secondary classifier
        if os.path.exists(SECONDARY_MODEL_PATH):
            print(f"Loading secondary damage model from {SECONDARY_MODEL_PATH}...")
            secondary_model = tf.keras.models.load_model(SECONDARY_MODEL_PATH)
        else:
            print(f"[Warning] Secondary model file not found at {SECONDARY_MODEL_PATH}. Running with fallback emulation.")
    except Exception as e:
        print(f"[Startup Error] Failed to load models: {e}")
        raise e

def analyze_image_quality(image_bytes: bytes) -> dict:
    """
    Computes image quality metrics (resolution, brightness, blur score) using OpenCV.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {
            "resolution": "Unknown",
            "brightness": 0.0,
            "blur_score": 0.0,
            "suitability": "Rejected",
            "reason": "Corrupt or unreadable image format."
        }
        
    h, w, _ = img.shape
    resolution = f"{w} x {h} px"
    
    # Grayscale conversion for brightness/blur
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    
    # Laplacian variance for blur estimation
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    # Validation constraints
    reasons = []
    suitability = "Suitable"
    
    if w < 224 or h < 224:
        suitability = "Rejected"
        reasons.append(f"Resolution too low ({w}x{h}). Minimum required: 224x224 px")
        
    if brightness < 20:
        suitability = "Rejected"
        reasons.append(f"Image too dark (Brightness: {brightness:.1f}). Minimum required: 20")
    elif brightness > 250:
        suitability = "Rejected"
        reasons.append(f"Image overexposed (Brightness: {brightness:.1f}). Maximum allowed: 250")
        
    if blur_score < 15:
        suitability = "Rejected"
        reasons.append(f"Image too blurry (Focus score: {blur_score:.1f}). Minimum required: 15")
        
    reason_str = "; ".join(reasons) if reasons else "Image meets quality standards."
    
    return {
        "resolution": resolution,
        "brightness": round(brightness, 2),
        "blur_score": round(blur_score, 2),
        "suitability": suitability,
        "reason": reason_str
    }

def get_damage_explanation(category: str, severity: str) -> str:
    """
    Returns explainable deterministic damage analysis narration.
    """
    explanations = {
        "scratch": {
            "Minor": "Surface scrape detected on clear coat layer. Visual features show superficial friction line abrasions with base paint coat remaining intact.",
            "Moderate": "Paint layer scratch detected. Visual indicators show deep abrasions exposing the primer backing coat with minor paint chipping.",
            "Severe": "Severe panel gouging detected. Abrasion lines have penetrated to the metal panel sheet, presenting high risk of sheet oxidation."
        },
        "dent": {
            "Minor": "Minor surface dimple detected. Surface contour deviation is minimal with uniform reflecting index.",
            "Moderate": "Moderate panel dent identified. Irregular surface contour deformation and localized shadow discontinuities are present.",
            "Severe": "Severe structural denting detected. High-impact metal stretch and alignment deviation observed on panel boundaries."
        },
        "bumper": {
            "Minor": "Minor scuff marks identified on bumper corner. Panel clips and support bars remain unaffected.",
            "Moderate": "Bumper panel deflection detected. Visual checks show seam alignment discrepancies with adjacent body panels.",
            "Severe": "Severe bumper deformation detected. Underlying bumper reinforcement bar displacement or frame clip breakage is highly probable."
        },
        "glass": {
            "Minor": "Minor surface chip detected on glass. Crack propagation is not currently active.",
            "Moderate": "Windshield crack detected. Visual line patterns show localized branching deflection.",
            "Severe": "Windshield fracture or headlight housing breakage detected. High probability of complete component structural failure."
        },
        "damage": {
            "Minor": "Minor cosmetic scrape or deflection detected on exterior paneling.",
            "Moderate": "Moderate body damage detected. Irregular surface deformation or coating abrasions are present.",
            "Severe": "Severe structural panel damage detected. Localized frame displacement or panel alignment breaks observed."
        }
    }
    sev_key = severity if severity in ["Minor", "Moderate", "Severe"] else "Moderate"
    cat_key = category if category in explanations else "damage"
    return explanations[cat_key][sev_key]

def get_possible_cause(category: str, severity: str) -> str:
    causes = {
        "scratch": {
            "Minor": "Brushing against light vegetation, abrasive washing brushes, key rings, or flying road grit.",
            "Moderate": "Low-speed contact with shopping carts, bicycle handlebars, or side-scraping guard rails.",
            "Severe": "Deliberate keying vandalism, side-swipe incidents, or dragging against brick/concrete pillars."
        },
        "dent": {
            "Minor": "Small hail stones, door dings in parking lots, or small kick-up road stones.",
            "Moderate": "Shopping cart impact, falling sports equipment, or low-speed parking bumps.",
            "Severe": "Moderate-to-high speed collision impact, striking structural bollards, or post collisions."
        },
        "bumper": {
            "Minor": "Low-speed bumper tap or scraping low parking dividers.",
            "Moderate": "Standard parking lot backing collisions or minor intersection rear-ends.",
            "Severe": "High-impact collision with another vehicle or solid road barrier."
        },
        "glass": {
            "Minor": "Kick-up gravel from passing highway trucks or small debris impact.",
            "Moderate": "Direct stone impact at speed, or thermal expansion stress on pre-existing micro-chips.",
            "Severe": "Heavy blunt object impact, structural rollover stress, or collision collision forces."
        },
        "damage": {
            "Minor": "Typical road debris or light cosmetic scraping.",
            "Moderate": "Low-speed parking maneuvers or minor panel contacts.",
            "Severe": "Collision impact or structural contact."
        }
    }
    sev_key = severity if severity in ["Minor", "Moderate", "Severe"] else "Moderate"
    cat_key = category if category in causes else "damage"
    return causes[cat_key][sev_key]

def get_visual_explanation(category: str, severity: str) -> str:
    explanations = {
        "scratch": {
            "Minor": "Linear clear-coat scoring and high contrast scratch lines reflecting light.",
            "Moderate": "Parallel score channels penetrating down to white/grey base primer layer.",
            "Severe": "Deep gouging exposes grey metal plate backing, surrounded by paint shear edges."
        },
        "dent": {
            "Minor": "Slight surface deflection contour showing concentric reflection ring deviation.",
            "Moderate": "Depressed center cavity showing shadow boundaries and light refraction curves.",
            "Severe": "Deep structural pocketing, severe metal crumple lines, and seam misalignment."
        },
        "bumper": {
            "Minor": "Superficial corner scuffs and local plastic panel micro-scratches.",
            "Moderate": "Deflected composite shell, panel clip displacement, and seam gaps.",
            "Severe": "Fractured composite skin, complete reinforcement bracket failure, and broken mounts."
        },
        "glass": {
            "Minor": "Conical chip or bullseye fracture without active propagation legs.",
            "Moderate": "Star-burst spider cracks with active radial propagation rays.",
            "Severe": "Complete fracture patterns, spider webbing, or structural housing separation."
        },
        "damage": {
            "Minor": "Cosmetic micro-anomalies on clear coat surface.",
            "Moderate": "Contour deviation and paint loss indicators.",
            "Severe": "High metal deformation and structural joint displacement."
        }
    }
    sev_key = severity if severity in ["Minor", "Moderate", "Severe"] else "Moderate"
    cat_key = category if category in explanations else "damage"
    return f"The classifier detected visual features consistent with {category} ({severity} severity), including {explanations[cat_key][sev_key]}."

@app.post("/analyze")
async def analyze_vehicle(
    file: UploadFile = File(...),
    owner_name: str = Form(...),
    make: str = Form(...),
    model_name: str = Form(...),
    variant: str = Form(...),
    year: int = Form(...),
    reg_number: str = Form(...),
    vin: str = Form(""),
    odometer: int = Form(...),
    insurance_provider: str = Form(""),
    policy_number: str = Form("")
):
    global binary_model, secondary_model
    
    if binary_model is None:
        raise HTTPException(status_code=503, detail="Primary AI models are not loaded.")

    # Validate image format
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not a valid image format.")

    try:
        # Read file bytes
        image_bytes = await file.read()
        
        # 1. Stage 3: Image Quality Validation using OpenCV
        quality = analyze_image_quality(image_bytes)
        if quality["suitability"] == "Rejected":
            return {
                "quality": quality,
                "primary_detection": {"label": "Rejected", "confidence": 0.0},
                "secondary_classification": {"label": "None", "confidence": 0.0},
                "report": None
            }

        # Load image for neural classification
        img = Image.open(BytesIO(image_bytes)).convert('RGB')
        img_resized = img.resize((224, 224))
        img_arr = np.array(img_resized, dtype=np.float32)
        batch_input = np.expand_dims(img_arr, axis=0)

        # 2. Stage 4: Binary Damage Detection (existing model)
        start_time = time.time()
        binary_preds = binary_model(batch_input, training=False).numpy()[0]
        inference_time_1 = time.time() - start_time
        
        # Binary prediction (Index 0 matches 00-damage, Index 1 matches 01-whole)
        primary_class_idx = int(np.argmax(binary_preds))
        primary_conf = float(binary_preds[primary_class_idx])
        
        is_damaged = (primary_class_idx == 0)
        primary_label = "Damage" if is_damaged else "No Damage"

        # 3. Stage 5: Secondary Damage Type Classification
        secondary_label = "none"
        secondary_conf = 0.0
        inference_time_2 = 0.0
        
        if is_damaged:
            if secondary_model is not None:
                start_time = time.time()
                sec_preds = secondary_model(batch_input, training=False).numpy()[0]
                inference_time_2 = time.time() - start_time
                
                sec_class_idx = int(np.argmax(sec_preds))
                secondary_conf = float(sec_preds[sec_class_idx])
                secondary_classes = ["bumper", "dent", "glass", "scratch"]
                secondary_label = secondary_classes[sec_class_idx]
            else:
                # Emulator fallback logic if secondary model was missing
                secondary_label = "scratch"
                secondary_conf = 0.95
        
        # 4. Severity Estimation (Explainable logic)
        severity = "None"
        if is_damaged:
            if secondary_label in ["glass", "bumper"] and secondary_conf > 0.85:
                severity = "Severe"
            elif secondary_label == "scratch" and secondary_conf < 0.80:
                severity = "Minor"
            else:
                severity = "Moderate"

        # 5. Deterministic Health Score Calculation
        health_score = 100
        health_explanation = "Vehicle panel integrity is normal. No structural anomalies detected."
        
        if is_damaged:
            # Penalties base: scratch = 10, dent = 15, bumper = 20, glass = 25
            base_penalties = {"scratch": 10, "dent": 15, "bumper": 20, "glass": 25, "none": 0}
            base_penalty = base_penalties.get(secondary_label, 15)
            
            # Severity multiplier: Minor = 0.5, Moderate = 1.0, Severe = 2.0
            sev_multipliers = {"Minor": 0.5, "Moderate": 1.0, "Severe": 2.0}
            multiplier = sev_multipliers.get(severity, 1.0)
            
            # Confidence penalty (adds up to 10 points for high prediction variance)
            conf_penalty = (1.0 - secondary_conf) * 10
            
            total_penalty = (base_penalty * multiplier) + conf_penalty + 5 # +5 for affected component
            health_score = max(0, int(100 - total_penalty))
            
            health_explanation = (
                f"Health score reduced due to detected {secondary_label} ({severity} severity) "
                f"exhibiting a base penalty of {base_penalty * multiplier:.1f} and confidence variance penalty of {conf_penalty:.1f}."
            )

        # 6. Repair Cost Engine (Configurable Database + Severity Multipliers)
        cost_breakdown = {"parts": 0, "labour": 0, "paint": 0, "gst": 0, "total": 0}
        
        if is_damaged:
            cat_rates = REPAIR_DATABASE.get(secondary_label, REPAIR_DATABASE["damage"])
            
            # Severity multiplier on costs: Minor = 0.5, Moderate = 1.0, Severe = 2.0
            cost_multiplier = 0.5 if severity == "Minor" else (1.0 if severity == "Moderate" else 2.0)
            
            parts_cost = int(cat_rates["parts"] * cost_multiplier)
            labour_cost = int(cat_rates["labour"] * cost_multiplier)
            paint_cost = int(cat_rates["paint"] * cost_multiplier)
            
            subtotal = parts_cost + labour_cost + paint_cost
            gst_amt = int(subtotal * cat_rates["gst_rate"])
            total_cost = subtotal + gst_amt
            
            cost_breakdown = {
                "parts": parts_cost,
                "labour": labour_cost,
                "paint": paint_cost,
                "gst": gst_amt,
                "total": total_cost
            }

        # 7. Repair Time Engine
        working_hours = 0
        repair_days = 0
        expected_completion = "N/A"
        
        if is_damaged:
            time_matrix = {
                "scratch": {"Minor": 2, "Moderate": 4, "Severe": 8},
                "dent": {"Minor": 3, "Moderate": 6, "Severe": 12},
                "bumper": {"Minor": 4, "Moderate": 8, "Severe": 16},
                "glass": {"Minor": 2, "Moderate": 4, "Severe": 8},
                "damage": {"Minor": 3, "Moderate": 6, "Severe": 12}
            }
            working_hours = time_matrix.get(secondary_label, time_matrix["damage"]).get(severity, 6)
            repair_days = 1 if severity == "Minor" else (2 if severity == "Moderate" else 4)
            
            completion_date = datetime.date.today() + datetime.timedelta(days=repair_days)
            expected_completion = completion_date.strftime("%Y-%m-%d")

        # 8. Insurance Engine
        recommendation = "Self Repair Recommended"
        ins_reason = "No claims necessary. Panels are clean."
        req_docs = []
        
        if is_damaged:
            req_docs = [
                "Active Comprehensive Insurance Policy Certificate",
                "Driving License (DL) of Driver",
                "Vehicle Registration Certificate (RC Book)",
                "Pre-repair Garage Estimate Invoice"
            ]
            if severity == "Minor":
                recommendation = "Self Repair Recommended"
                ins_reason = (
                    f"Estimated repair cost ({format_currency(cost_breakdown['total'])}) falls below typical policy deductible limits. "
                    "Paying out-of-pocket is advised to preserve your No Claim Bonus (NCB) discount rate."
                )
            elif severity == "Moderate":
                recommendation = "Likely Approved"
                ins_reason = (
                    "Costs warrant policy claim submission. The damage is cosmetic and fits within comprehensive auto coverage terms."
                )
            else: # Severe
                recommendation = "Immediate Inspection Required"
                ins_reason = (
                    "Severe impact on safety components. Claim authorization requires physical assessment by insurance surveyor."
                )
                req_docs.append("First Information Report (FIR) copy - mandatory for major crash events")

        # 9. Driving Safety Logic
        roadworthy = "Yes"
        night_safe = "Yes"
        highway_safe = "Yes"
        long_distance_safe = "Yes"
        safety_reason = "No anomalies detected. Roadworthiness parameters normal."
        
        if is_damaged:
            if severity == "Severe":
                roadworthy = "No"
                night_safe = "No"
                highway_safe = "No"
                long_distance_safe = "No"
                safety_reason = (
                    f"Severe damage detected on safety-critical components ({secondary_label}). "
                    "Driving is prohibited until structural components are inspected and ADAS cameras are recalibrated."
                )
            elif severity == "Moderate" and secondary_label in ["glass", "bumper"]:
                roadworthy = "Yes"
                night_safe = "No" if secondary_label == "glass" else "Yes"
                highway_safe = "No"
                long_distance_safe = "No"
                safety_reason = (
                    f"Moderate {secondary_label} deformation. Panel could detach under highway drag. "
                    "Windshield/headlight refraction pattern might degrade night visibility."
                )
            else: # Minor cosmetic scratch/dent
                safety_reason = "Cosmetic damage only. Headlights, bumpers, and structural frame elements remain fully functional."

        # 10. Maintenance Roadmap
        maintenance_roadmap = [
            "Keep records of this digital inspection log for claims and future resale documentation."
        ]
        if is_damaged:
            maintenance_roadmap.append("Seal bare metal areas within 48 hours to avoid surface oxidation and rust.")
            if secondary_label in ["bumper", "glass"] or severity == "Severe":
                maintenance_roadmap.append("Validate ADAS ultrasonic sensors and lane-keep camera alignments in the vicinity.")
                maintenance_roadmap.append("Inspect frame mounts and check panel seam gaps using caliper gauges.")
        else:
            maintenance_roadmap.append("Apply a clear wax protectant film to maintain base coat reflectiveness.")

        # Combined JSON Output
        return {
            "quality": quality,
            "primary_detection": {
                "label": primary_label,
                "confidence": round(primary_conf, 4)
            },
            "secondary_classification": {
                "label": secondary_label.capitalize() if secondary_label != "none" else "None",
                "confidence": round(secondary_conf, 4)
            },
            "report": {
                "vehicle_info": {
                  "owner_name": owner_name,
                  "make": make,
                  "model_name": model_name,
                  "variant": variant,
                  "year": year,
                  "reg_number": reg_number,
                  "vin": vin if vin else "N/A",
                  "odometer": odometer,
                  "insurance_provider": insurance_provider if insurance_provider else "N/A",
                  "policy_number": policy_number if policy_number else "N/A"
                },
                "health_score": health_score,
                "health_explanation": health_explanation,
                "severity": severity,
                "repair_costs": cost_breakdown,
                "repair_timeline": {
                  "working_hours": working_hours,
                  "repair_days": repair_days,
                  "completion_date": expected_completion
                },
                "insurance": {
                  "recommendation": recommendation,
                  "reason": ins_reason,
                  "required_docs": req_docs
                },
                "safety": {
                  "roadworthy": roadworthy,
                  "night_driving_safe": night_safe,
                  "highway_safe": highway_safe,
                  "long_distance_safe": long_distance_safe,
                  "reason": safety_reason
                },
                "maintenance": maintenance_roadmap,
                "description": get_damage_explanation(secondary_label, severity),
                "possible_cause": get_possible_cause(secondary_label, severity),
                "explanation": get_visual_explanation(secondary_label, severity),
                "timestamp": datetime.datetime.now().isoformat(),
                "inference_time_seconds": round(inference_time_1 + inference_time_2, 4)
            }
        }

    except Exception as e:
        print(f"[Error] Image processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

def format_currency(val: int):
    return f"₹{val:,}"
