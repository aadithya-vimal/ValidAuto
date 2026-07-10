import os
import time
import datetime
import asyncio
import concurrent.futures
import functools
import hashlib
import numpy as np
import cv2
import base64
import json
from PIL import Image, ImageOps
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from app.ocr import perform_ocr

try:
    from scipy import stats as _scipy_stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# ============================================================================
#  Module-level constants for the multi-subsystem pipeline
# ============================================================================

# 11 subsystems (weights sum to 1.00). Safety impact: H=high, M=moderate, L=low.
SUBSYSTEM_WEIGHTS = {
    "body_panel":       0.20,
    "windshield_glass": 0.15,
    "headlight":        0.08,
    "tail_light":       0.06,
    "side_mirror":      0.06,
    "tire_wheel":       0.08,
    "bumper":           0.10,
    "paint_condition":  0.08,
    "panel_alignment":  0.07,
    "wiper_blade":      0.04,
    "electrical_marker":0.08,
}

# Soft caps on the OVERALL health score only — never on per-subsystem scores.
SEVERE_CAP = 55
SEVERE_FLOOR = 35
MODERATE_CAP = 78
MODERATE_FLOOR = 65

# Subsystems that affect roadworthiness if their score drops below 50.
SAFETY_CRITICAL_SUBSYSTEMS = {
    "windshield_glass", "headlight", "tail_light",
    "tire_wheel", "bumper", "electrical_marker",
}

# Per-subsystem cost tables in INR. Tuples are
# (parts_min, parts_max, labour_min, labour_max, paint_min, paint_max).
COST_TABLES = {
    "body_panel": {
        "Minor":    (0, 1500, 1000, 2500, 1500, 3500),
        "Moderate": (1500, 4000, 3000, 6000, 3000, 6000),
        "Severe":   (4500, 12000, 6000, 14000, 5000, 10000),
    },
    "windshield_glass": {
        "Minor":    (3500, 6000, 1500, 2500, 0, 0),
        "Moderate": (8000, 12000, 2000, 3000, 0, 0),
        "Severe":   (14000, 22000, 2500, 4000, 0, 0),
    },
    "headlight": {
        "Minor":    (2500, 4500, 800, 1500, 0, 0),
        "Moderate": (4500, 7500, 1200, 2000, 0, 0),
        "Severe":   (6500, 12000, 1500, 3000, 0, 0),
    },
    "tail_light": {
        "Minor":    (2000, 3500, 800, 1500, 0, 0),
        "Moderate": (3500, 6000, 1200, 2000, 0, 0),
        "Severe":   (5500, 9500, 1500, 3000, 0, 0),
    },
    "side_mirror": {
        "Minor":    (1500, 3000, 500, 1000, 0, 0),
        "Moderate": (2500, 4500, 700, 1500, 0, 600),
        "Severe":   (3500, 6500, 1000, 2000, 600, 1200),
    },
    "tire_wheel": {
        "Minor":    (3500, 5500, 800, 1200, 0, 0),
        "Moderate": (6500, 9500, 1000, 1800, 0, 0),
        "Severe":   (8500, 15000, 1200, 2500, 0, 0),
    },
    "bumper": {
        "Minor":    (3500, 6000, 1500, 2500, 2000, 3500),
        "Moderate": (6500, 10500, 2500, 4000, 3500, 5500),
        "Severe":   (9000, 16000, 3000, 5500, 4500, 7500),
    },
    "paint_condition": {
        "Minor":    (0, 0, 800, 1500, 3500, 6000),
        "Moderate": (0, 0, 1500, 2500, 6000, 10000),
        "Severe":   (0, 0, 2500, 4500, 9500, 16000),
    },
    "panel_alignment": {
        "Minor":    (0, 0, 2500, 4500, 1500, 3000),
        "Moderate": (0, 0, 4500, 7500, 2500, 5000),
        "Severe":   (0, 0, 6000, 11000, 3000, 6500),
    },
    "wiper_blade": {
        "Minor":    (500, 1000, 200, 400, 0, 0),
        "Moderate": (800, 1400, 300, 500, 0, 0),
        "Severe":   (900, 1500, 300, 500, 0, 0),
    },
    "electrical_marker": {
        "Minor":    (0, 0, 800, 1500, 0, 0),
        "Moderate": (0, 0, 1000, 2000, 0, 0),
        "Severe":   (0, 0, 1200, 3000, 0, 0),
    },
}

# Parallel executor for CV heuristics (CPU-bound, so 4 workers is enough).
_INFERENCE_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=4, thread_name_prefix="va-cv"
)

# Map of secondary classification labels to display names (kept for back-compat).
SECONDARY_LABEL_MAP = ["bumper", "dent", "glass", "scratch"]


def _entropy_from_hist(hist: np.ndarray) -> float:
    """Shannon entropy of a normalized histogram."""
    if SCIPY_AVAILABLE:
        # scipy.stats.entropy expects probabilities.
        h = hist.astype(np.float64)
        s = h.sum()
        if s <= 0:
            return 0.0
        return float(_scipy_stats.entropy(h / s))
    # Fallback: hand-rolled Shannon entropy if scipy is not available.
    h = hist.astype(np.float64)
    s = h.sum()
    if s <= 0:
        return 0.0
    p = h / s
    p = p[p > 0]
    return float(-np.sum(p * np.log(p)))


def cached_quality_metrics(img_np: np.ndarray) -> dict:
    """LRU-cached wrapper around calculate_quality_metrics, keyed on bytes.

    Re-running the gate on the same image is essentially free after the first
    call. We hash the image bytes (not the np array) so the cache key is
    stable across requests.
    """
    raw = img_np.tobytes()
    key = hashlib.md5(raw).hexdigest() + f"|{img_np.shape[0]}x{img_np.shape[1]}"
    return _quality_cache.get(key) or _quality_cache.setdefault(
        key, calculate_quality_metrics(img_np)
    )


_quality_cache: dict = {}


def get_secondary_model() -> "tf.keras.Model | None":
    """Lazy loader for the secondary classifier. Returns None if file is missing.

    Backed by lru_cache so the model is loaded at most once per process.
    """
    return _secondary_model_singleton()


@functools.lru_cache(maxsize=1)
def _secondary_model_singleton() -> "tf.keras.Model | None":
    if not os.path.exists(SECONDARY_MODEL_PATH):
        print(f"[Info] Secondary model not present at {SECONDARY_MODEL_PATH}.")
        return None
    print(f"[first-use] Loading secondary damage model from {SECONDARY_MODEL_PATH}...")
    return tf.keras.models.load_model(SECONDARY_MODEL_PATH)

app = FastAPI(
    title="ValidAuto Inspection API",
    description="Multi-stage neural pipeline with image enhancement and Grad-CAM explainability",
    version="5.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db")
os.makedirs(DB_DIR, exist_ok=True)

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

def calculate_quality_metrics(img: np.ndarray) -> dict:
    """
    Computes image quality metrics and assigns a rating: Excellent, Good, Fair, Poor, or Rejected.
    """
    h, w, _ = img.shape
    resolution_str = f"{w} x {h} px"
    
    # Grayscale conversion for metrics
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    brightness = float(np.mean(gray))
    
    # Laplacian variance for blur score
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    # Suitability Logic - Only reject genuinely unusable images
    reasons = []
    suitability = "Suitable"
    rating = "Good"
    
    # Genuinely unusable constraints (micro-images, complete black/white, or extreme blur)
    if w < 64 or h < 64:
        suitability = "Rejected"
        reasons.append("Image is extremely small (Under 64x64 pixels).")
    elif brightness < 5:
        suitability = "Rejected"
        reasons.append("Image is pitch black (Under 5 brightness units).")
    elif brightness > 253:
        suitability = "Rejected"
        reasons.append("Image is completely white/overexposed (Over 253 brightness units).")
    elif blur_score < 2.0:
        suitability = "Rejected"
        reasons.append("Image is completely unreadable or blank.")

    if suitability == "Rejected":
        rating = "Poor"
    else:
        # Determine rating: Excellent, Good, Fair, Poor
        if w >= 800 and h >= 600 and 80 <= brightness <= 180 and blur_score >= 80:
            rating = "Excellent"
        elif w >= 480 and h >= 480 and 60 <= brightness <= 220 and blur_score >= 40:
            rating = "Good"
        elif w >= 224 and h >= 224 and 40 <= brightness <= 240 and blur_score >= 20:
            rating = "Fair"
        else:
            rating = "Poor"
            
        if rating in ["Fair", "Poor"]:
            if w < 224 or h < 224:
                reasons.append("Low resolution (Under 224x224 px). Enhancement applied.")
            if brightness < 40 or brightness > 240:
                reasons.append("Non-optimal lighting conditions detected.")
            if blur_score < 20:
                reasons.append("Low contrast / camera motion blur detected.")

    reason_str = "; ".join(reasons) if reasons else "Image meets quality standards."
    
    return {
        "resolution": resolution_str,
        "brightness": round(brightness, 2),
        "blur_score": round(blur_score, 2),
        "rating": rating,
        "suitability": suitability,
        "reason": reason_str
    }

def enhance_image(img_cv: np.ndarray) -> np.ndarray:
    """
    Applies automatic image enhancement operations: CLAHE, brightness/contrast normalization,
    light denoising, and mild sharpening.
    """
    # 1. Apply CLAHE on LAB Color Space (Low contrast enhancement)
    lab = cv2.cvtColor(img_cv, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    # Only apply CLAHE if standard deviation (contrast) is low
    if np.std(l_channel) < 42:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        
    # 2. Normalize Brightness & Contrast
    mean_l = np.mean(l_channel)
    if mean_l < 95:
        # Amplify low light
        l_channel = cv2.convertScaleAbs(l_channel, alpha=1.2, beta=15)
    elif mean_l > 185:
        # Tone down overexposure
        l_channel = cv2.convertScaleAbs(l_channel, alpha=0.9, beta=-10)
        
    enhanced = cv2.merge((l_channel, a_channel, b_channel))
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
    
    # 3. Light Denoising (Bilateral filtering preserves sharp edges)
    enhanced = cv2.bilateralFilter(enhanced, d=5, sigmaColor=35, sigmaSpace=35)
    
    # 4. Mild Sharpening
    sharpen_kernel = np.array([
        [0, -0.15, 0],
        [-0.15, 1.6, -0.15],
        [0, -0.15, 0]
    ])
    enhanced = cv2.filter2D(enhanced, -1, sharpen_kernel)
    
    return enhanced

def generate_simulated_heatmap(img_rgb: np.ndarray, res=(224, 224)) -> np.ndarray:
    """
    Focal simulated heatmap focusing on high-contrast edge boundaries (scratches/dents).
    """
    img_uint8 = np.clip(img_rgb, 0, 255).astype(np.uint8)
    gray = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2GRAY)
    
    # Compute Sobel edge vectors
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(sobelx**2 + sobely**2)
    
    # Apply Gaussian blur to create smooth glow fields
    heatmap = cv2.GaussianBlur(magnitude, (21, 21), 0)
    
    # Normalize map [0.0, 1.0]
    max_val = np.max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val
    else:
        # Center-weighted fallback map if completely flat
        h, w = res
        y, x = np.ogrid[:h, :w]
        cy, cx = h // 2, w // 2
        heatmap = np.exp(-((x - cx)**2 + (y - cy)**2) / (2 * (50**2)))
        
    return cv2.resize(heatmap, res)

def compute_gradcam(model, img_array, target_res=(224, 224)) -> np.ndarray:
    """
    Dynamically traces model layers to compute Grad-CAM colormaps.
    Falls back to edge-intensity simulated heatmaps if TF/Keras tracing fails.
    """
    try:
        # Find nested base model or functional layers
        nested_model = None
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model) or 'mobilenet' in layer.name.lower():
                nested_model = layer
                break
                
        if nested_model is not None:
            last_conv_layer = None
            for layer in reversed(nested_model.layers):
                if len(layer.output_shape) == 4 and ('conv' in layer.name.lower() or 'relu' in layer.name.lower()):
                    last_conv_layer = layer
                    break
                    
            if last_conv_layer is not None:
                sub_model = tf.keras.Model(
                    inputs=nested_model.inputs,
                    outputs=[last_conv_layer.output, nested_model.output]
                )
                
                with tf.GradientTape() as tape:
                    # Pass inputs through preceding top-level layers
                    x = img_array
                    for layer in model.layers:
                        if layer == nested_model:
                            break
                        x = layer(x)
                        
                    conv_outputs, model_outputs = sub_model(x)
                    
                    # Pass model_outputs through top-level head layers
                    y = model_outputs
                    reached_nested = False
                    for layer in model.layers:
                        if reached_nested:
                            y = layer(y)
                        if layer == nested_model:
                            reached_nested = True
                            
                    class_idx = np.argmax(y[0])
                    loss = y[:, class_idx]
                    
                grads = tape.gradient(loss, conv_outputs)
                pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
                conv_outputs = conv_outputs[0]
                heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
                heatmap = tf.squeeze(heatmap)
                heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
                return cv2.resize(heatmap.numpy(), target_res)
                
        # If not nested
        last_conv_layer = None
        for layer in reversed(model.layers):
            if len(layer.output_shape) == 4 and ('conv' in layer.name.lower() or 'relu' in layer.name.lower()):
                last_conv_layer = layer
                break
                
        if last_conv_layer is not None:
            grad_model = tf.keras.Model(
                inputs=model.inputs,
                outputs=[last_conv_layer.output, model.output]
            )
            with tf.GradientTape() as tape:
                conv_outputs, predictions = grad_model(img_array)
                class_idx = np.argmax(predictions[0])
                loss = predictions[:, class_idx]
                
            grads = tape.gradient(loss, conv_outputs)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            conv_outputs = conv_outputs[0]
            heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
            return cv2.resize(heatmap.numpy(), target_res)
            
        raise ValueError("No convolutional layers located.")
    except Exception as e:
        print(f"[Grad-CAM Warning] Standard trace failed ({e}). Falling back to simulated heatmap.")
        # Pass first image in batch [0]
        return generate_simulated_heatmap(img_array[0], target_res)

def apply_heatmap_overlay(img_rgb: np.ndarray, heatmap: np.ndarray, alpha=0.45) -> np.ndarray:
    """
    Overlays colormap attention map on top of RGB image.
    """
    heatmap_uint8 = np.uint8(255 * heatmap)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    
    # Overlay overlay = img * (1-alpha) + heatmap_color_rgb * alpha
    overlay = cv2.addWeighted(img_rgb.astype(np.uint8), 1 - alpha, heatmap_color_rgb, alpha, 0)
    return overlay

def to_base64_url(img_rgb: np.ndarray) -> str:
    """
    Converts RGB image to Base64 data URL string.
    """
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def compute_damage_localization(img_rgb: np.ndarray, heatmap: np.ndarray, category: str = "none", confidence: float = 0.0) -> dict:
    # Threshold heatmap to get a binary mask (activations above 0.35)
    _, thresh = cv2.threshold(np.uint8(255 * heatmap), 90, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    h, w, _ = img_rgb.shape
    total_area = h * w
    mask_area = 0
    num_regions = 0
    largest_region = 0.0
    
    # Create translucent red mask overlay
    mask_overlay = np.zeros_like(img_rgb)
    
    # Grid segmentation for Affected Vehicle Area
    affected_areas = []
    
    overlay = img_rgb.copy()
    
    for c in contours:
        area = cv2.contourArea(c)
        if area < 40:  # Noise filter
            continue
            
        num_regions += 1
        mask_area += area
        if area > largest_region:
            largest_region = area
            
        # Draw translucent red mask on the overlay
        cv2.drawContours(mask_overlay, [c], -1, (255, 0, 0), -1)  # Fill mask in Red (represented as Blue in BGR, but we are in RGB!)
        # Draw green contour borders
        cv2.drawContours(overlay, [c], -1, (16, 185, 129), 1)
        
        # Get bounding box
        x, y, box_w, box_h = cv2.boundingRect(c)
        
        # Calculate centroid using moments
        M = cv2.moments(c)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx = x + box_w // 2
            cy = y + box_h // 2
            
        # Draw bounding box in bright green on the overlay
        cv2.rectangle(overlay, (x, y), (x + box_w, y + box_h), (5, 235, 115), 2)
        
        # Draw centroid target icon (Yellow circle with crosshair)
        cv2.circle(overlay, (cx, cy), 4, (245, 158, 11), -1)
        cv2.line(overlay, (cx - 7, cy), (cx + 7, cy), (245, 158, 11), 1)
        cv2.line(overlay, (cx, cy - 7), (cx, cy + 7), (245, 158, 11), 1)
        
        # Label regions
        cv2.putText(overlay, f"Loc {num_regions}", (x, max(y - 5, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (245, 158, 11), 1)
        
        # Compute grid coordinate region
        vert = "Middle"
        if cy < h * 0.35:
            vert = "Upper"
        elif cy > h * 0.65:
            vert = "Lower"
            
        horiz = "Center"
        if cx < w * 0.35:
            horiz = "Left"
        elif cx > w * 0.65:
            horiz = "Right"
            
        area_str = f"Estimated Damage Region: {vert} {horiz}"
        
        # High confidence panel naming
        if confidence >= 0.85:
            if category.lower() == "glass":
                area_str += " (Windshield / Optical Glass)"
            elif category.lower() == "bumper":
                area_str += " (Bumper Fascia Panel)"
            elif category.lower() == "dent" or category.lower() == "scratch":
                if vert == "Lower" and horiz == "Center":
                    area_str += " (Underbody Panel / Bumper)"
                else:
                    area_str += " (Exterior Door / Fender Panel)"
                    
        if area_str not in affected_areas:
            affected_areas.append(area_str)
            
    # Apply alpha blending for translucent mask
    # BGR/RGB: Mask overlay has Red channel filled.
    # We blend mask_overlay (which is red) with overlay
    cv2.addWeighted(mask_overlay, 0.3, overlay, 0.7, 0, overlay)
            
    coverage_pct = (mask_area / total_area) * 100
    affected_area_result = ", ".join(affected_areas) if affected_areas else "Estimated Damage Region: Unspecified"
    
    return {
        "overlay_img": overlay,
        "coverage_pct": round(coverage_pct, 2),
        "num_regions": num_regions,
        "largest_region_pct": round((largest_region / total_area) * 100, 2),
        "affected_area": affected_area_result
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
class SafetyAssessmentEngine:
    @staticmethod
    def assess(
        category: str,
        severity: str,
        num_regions: int,
        coverage_pct: float,
        is_damaged: bool
    ) -> dict:
        if not is_damaged or category == "none":
            return {
                "roadworthy": "Safe",
                "night_driving_safe": "Safe",
                "highway_safe": "Safe",
                "rain_driving_safe": "Safe",
                "long_distance_safe": "Safe",
                "immediate_repair_required": "No",
                "reason": "Vehicle safety systems and panel integrity are in normal operating condition."
            }

        # Check Unsafe conditions (Severe body deformation, shattered glass, multiple damaged regions, or high coverage)
        is_unsafe = (
            severity == "Severe" or
            (category == "glass" and severity in ["Moderate", "Severe"]) or
            num_regions > 1 or
            coverage_pct > 3.0
        )

        if is_unsafe:
            if severity == "Severe":
                reason = "Severe structural panel deformation compromises aerodynamic safety and ADAS calibration profiles."
            elif category == "glass":
                reason = "Shattered or fractured glass panels compromise cabin pressure, occupant safety, and optical visibility."
            elif num_regions > 1:
                reason = f"Multiple damaged regions ({num_regions}) compromise overall vehicle structural integrity."
            else:
                reason = f"High area damage coverage ({coverage_pct:.1f}%) exceeds safety-critical boundaries."

            return {
                "roadworthy": "Unsafe",
                "night_driving_safe": "Unsafe",
                "highway_safe": "Unsafe",
                "rain_driving_safe": "Unsafe",
                "long_distance_safe": "Unsafe",
                "immediate_repair_required": "Yes",
                "reason": reason
            }

        # Moderate Severity -> Use With Caution
        if severity == "Moderate":
            return {
                "roadworthy": "Use With Caution",
                "night_driving_safe": "Use With Caution",
                "highway_safe": "Use With Caution",
                "rain_driving_safe": "Use With Caution",
                "long_distance_safe": "Use With Caution",
                "immediate_repair_required": "Yes",
                "reason": f"Moderate {category} detected. Highway aerodynamic drag or night lighting glare may affect driving characteristics."
            }

        # Minor Severity -> Safe but Use With Caution in heavy rain
        return {
            "roadworthy": "Safe",
            "night_driving_safe": "Safe",
            "highway_safe": "Safe",
            "rain_driving_safe": "Use With Caution",
            "long_distance_safe": "Safe",
            "immediate_repair_required": "No",
            "reason": f"Minor cosmetic {category} only. Basic driving operations and structural mounts remain fully intact."
        }

class RepairCostEngine:
    @staticmethod
    def calculate_cost(
        category: str,
        severity: str,
        num_regions: int,
        coverage_pct: float,
        is_damaged: bool
    ) -> dict:
        cost_breakdown = {"parts": 0, "labour": 0, "paint": 0, "gst": 0, "total": 0}
        repair_items = []
        if not is_damaged or category == "none":
            return {**cost_breakdown, "items": repair_items}

        database = {
            "scratch": {"parts": 0, "labour": 2000, "paint": 3000},
            "dent": {"parts": 1500, "labour": 4000, "paint": 3500},
            "bumper": {"parts": 9500, "labour": 3000, "paint": 4000},
            "glass": {"parts": 12000, "labour": 2500, "paint": 0},
            "damage": {"parts": 4000, "labour": 3000, "paint": 3500}
        }

        item_map = {
            "scratch": [
                {"part": "paint_condition", "damage": "Clear coat and top-layer paint abrasion", "weight": 0.55},
                {"part": "body_panel", "damage": "Visible surface scoring on exposed panel", "weight": 0.25},
                {"part": "side_mirror", "damage": "Mirror housing scuffing or edge scrape", "weight": 0.20},
            ],
            "dent": [
                {"part": "body_panel", "damage": "Sheet metal indentation / panel deformation", "weight": 0.55},
                {"part": "panel_alignment", "damage": "Door / quarter panel seam misalignment", "weight": 0.25},
                {"part": "bumper", "damage": "Localized bumper push-in or clip stress", "weight": 0.20},
            ],
            "bumper": [
                {"part": "bumper", "damage": "Impact compression, clip damage, or plastic deformation", "weight": 0.65},
                {"part": "panel_alignment", "damage": "Nearby mounting and seam alignment shift", "weight": 0.20},
                {"part": "electrical_marker", "damage": "Sensor / parking marker disturbance near bumper area", "weight": 0.15},
            ],
            "glass": [
                {"part": "windshield_glass", "damage": "Chip, crack propagation, or fracture pattern on glass", "weight": 0.70},
                {"part": "wiper_blade", "damage": "Potential wiper contact damage or sweep interference", "weight": 0.15},
                {"part": "electrical_marker", "damage": "Camera / sensor alignment check required near glass area", "weight": 0.15},
            ],
            "damage": [
                {"part": "body_panel", "damage": "General exterior body panel damage", "weight": 0.45},
                {"part": "paint_condition", "damage": "Paint loss, abrasion, or finish degradation", "weight": 0.30},
                {"part": "panel_alignment", "damage": "Panel seam or mounting misalignment", "weight": 0.25},
            ],
        }

        rates = database.get(category, database["damage"])
        multiplier = 0.8 if severity == "Minor" else (1.5 if severity == "Moderate" else 3.0)

        # Region Factor represents extra labor and parts for multiple panels
        region_factor = 1.0 + (max(0, num_regions - 1) * 0.25)
        # Coverage Factor accounts for extra paint prep work
        coverage_factor = 1.0 + (coverage_pct / 5.0)

        parts_cost = int(rates["parts"] * multiplier * region_factor)
        labour_cost = int(rates["labour"] * multiplier * region_factor)
        paint_cost = int(rates["paint"] * multiplier * region_factor * coverage_factor)

        subtotal = parts_cost + labour_cost + paint_cost
        gst_amt = int(subtotal * 0.18)
        total_cost = subtotal + gst_amt

        line_items = item_map.get(category, item_map["damage"])
        for entry in line_items:
            line_weight = entry["weight"]
            line_parts = int(round(parts_cost * line_weight))
            line_labour = int(round(labour_cost * line_weight))
            line_paint = int(round(paint_cost * line_weight))
            line_subtotal = line_parts + line_labour + line_paint
            repair_items.append({
                "part": entry["part"],
                "damage": entry["damage"],
                "severity": severity,
                "parts": line_parts,
                "labour": line_labour,
                "paint": line_paint,
                "subtotal": line_subtotal,
            })

        return {
            "parts": parts_cost,
            "labour": labour_cost,
            "paint": paint_cost,
            "gst": gst_amt,
            "total": total_cost,
            "items": repair_items
        }

class HealthScoreEngine:
    @staticmethod
    def calculate_score(
        category: str,
        severity: str,
        confidence: float,
        coverage_pct: float,
        num_regions: int,
        safety_status: str,
        is_damaged: bool
    ) -> tuple[int, str, dict]:
        subsystem_scores = {
            "body_panel": 100,
            "windshield_glass": 100,
            "headlight": 100,
            "tail_light": 100,
            "side_mirror": 100,
            "tire_wheel": 100,
            "bumper": 100,
            "paint_condition": 100,
            "panel_alignment": 100,
            "wiper_blade": 100,
            "electrical_marker": 100,
        }

        if not is_damaged or category == "none":
            details = {
                "overall_category": "none",
                "severity": "None",
                "confidence": confidence,
                "coverage_pct": coverage_pct,
                "num_regions": num_regions,
                "safety_status": safety_status,
                "subsystem_scores": subsystem_scores,
                "affected_subsystems": [],
            }
            return 100, "Vehicle panel integrity is normal. No structural anomalies detected.", details

        category_map = {
            "scratch": ["paint_condition", "body_panel", "side_mirror"],
            "dent": ["body_panel", "panel_alignment", "bumper"],
            "bumper": ["bumper", "panel_alignment", "electrical_marker"],
            "glass": ["windshield_glass", "electrical_marker", "wiper_blade"],
        }
        affected_subsystems = category_map.get(category, ["body_panel"])

        severity_targets = {
            "Minor": 82,
            "Moderate": 62,
            "Severe": 35,
        }
        base_target = severity_targets.get(severity, 62)

        # Core weighted penalties
        severity_penalty = 100 - base_target
        confidence_penalty = max(0.0, (1.0 - confidence) * 18.0)
        coverage_penalty = min(18.0, coverage_pct * 1.6)
        region_penalty = min(12.0, max(0, num_regions - 1) * 3.5)

        safety_penalty = 0.0
        if safety_status == "Unsafe":
            safety_penalty = 18.0
        elif safety_status == "Use With Caution":
            safety_penalty = 8.0

        # Build subsystem scores so the UI can show more than a single number.
        for subsystem, weight in SUBSYSTEM_WEIGHTS.items():
            score = 100.0
            if subsystem in affected_subsystems:
                score = base_target
                if subsystem == "paint_condition":
                    score -= 4 if severity == "Minor" else 8 if severity == "Moderate" else 14
                elif subsystem == "panel_alignment":
                    score -= 2 if severity == "Minor" else 6 if severity == "Moderate" else 12
                elif subsystem == "electrical_marker":
                    score -= 10 if severity == "Severe" else 4 if severity == "Moderate" else 1
                elif subsystem == "windshield_glass":
                    score -= 8 if severity == "Severe" else 4 if severity == "Moderate" else 1
                elif subsystem == "bumper":
                    score -= 6 if severity == "Severe" else 3 if severity == "Moderate" else 1
                else:
                    score -= 0
            if subsystem in SAFETY_CRITICAL_SUBSYSTEMS and severity == "Severe":
                score -= 8
            if subsystem == "body_panel":
                score -= coverage_penalty * 0.7
            if subsystem == "paint_condition":
                score -= coverage_penalty * 0.9
            if subsystem == "panel_alignment":
                score -= region_penalty * 0.8
            if subsystem in {"windshield_glass", "electrical_marker"} and safety_status == "Unsafe":
                score -= 8
            subsystem_scores[subsystem] = int(max(0, min(100, round(score))))

        weighted_sum = 0.0
        for subsystem, weight in SUBSYSTEM_WEIGHTS.items():
            weighted_sum += subsystem_scores[subsystem] * weight

        total_deduction = severity_penalty + confidence_penalty + coverage_penalty + region_penalty + safety_penalty
        combined_score = weighted_sum - (confidence_penalty * 0.35) - (coverage_penalty * 0.55) - (region_penalty * 0.45) - safety_penalty

        # Healthy cars should reach 100 only when they are genuinely whole.
        if category == "none":
            final_score = 100
        else:
            final_score = int(max(1, min(99, round(combined_score))))
            if severity == "Minor":
                final_score = max(final_score, 70)
            elif severity == "Moderate":
                final_score = min(final_score, 89)
            else:
                final_score = min(final_score, 69)

        explanation = (
            f"Weighted subsystem score: {weighted_sum:.1f}. "
            f"Confidence deduction: {confidence_penalty:.1f}. "
            f"Coverage deduction: {coverage_penalty:.1f} ({coverage_pct:.1f}% area). "
            f"Region deduction: {region_penalty:.1f} ({num_regions} region(s)). "
            f"Safety deduction: {safety_penalty:.1f} ({safety_status}). "
            f"Affected subsystems: {', '.join(affected_subsystems)}."
        )
        details = {
            "overall_category": category,
            "severity": severity,
            "confidence": confidence,
            "coverage_pct": coverage_pct,
            "num_regions": num_regions,
            "safety_status": safety_status,
            "subsystem_scores": subsystem_scores,
            "affected_subsystems": affected_subsystems,
        }
        return final_score, explanation, details

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

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not a valid image format.")

    try:
        # Read file bytes
        image_bytes = await file.read()
        
        # Load raw image using PIL
        pil_img_raw = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Correct EXIF Orientation (rotate to normal upright state)
        pil_img = ImageOps.exif_transpose(pil_img_raw)
        
        # Convert PIL to OpenCV RGB numpy array for quality assessment and enhancements
        img_np = np.array(pil_img)
        
        # Run OCR extraction
        ocr_res = perform_ocr(img_np)
        
        # 1. Image Quality Assessment (OpenCV)
        quality = calculate_quality_metrics(img_np)
        
        # Reject genuinely unusable images
        if quality["suitability"] == "Rejected":
            return {
                "quality": quality,
                "primary_detection": {"label": "Rejected", "confidence": 0.0},
                "secondary_classification": {"label": "None", "confidence": 0.0},
                "report": None
            }

        # Preserve the original image base64 before resizing/filtering
        original_base64 = to_base64_url(img_np)

        # 2. Automatic Image Enhancement (CLAHE + Contrast normalizing + denoising + sharpening)
        enhanced_np = enhance_image(img_np)
        enhanced_base64 = to_base64_url(enhanced_np)

        # 3. Resize enhanced image to model input size (224x224)
        img_resized = cv2.resize(enhanced_np, (224, 224))
        img_arr = np.array(img_resized, dtype=np.float32)
        batch_input = np.expand_dims(img_arr, axis=0)

        # 4. Stage 4: Binary Damage Detection (existing model)
        start_time = time.time()
        binary_preds = binary_model(batch_input, training=False).numpy()[0]
        inference_time_1 = time.time() - start_time
        
        primary_class_idx = int(np.argmax(binary_preds))
        primary_conf = float(binary_preds[primary_class_idx])
        
        is_damaged = (primary_class_idx == 0)
        primary_label = "Damage" if is_damaged else "No Damage"

        # 5. Stage 5: Secondary Damage Type Classification
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
                # Emulator fallback
                secondary_label = "scratch"
                secondary_conf = 0.95
        
        # 6. Grad-CAM & Damage Localization Engine
        active_model = secondary_model if (is_damaged and secondary_model is not None) else binary_model
        heatmap_grid = compute_gradcam(active_model, batch_input, target_res=(224, 224))
        
        # Overlay heatmap on resized enhanced image
        heatmap_overlay_rgb = apply_heatmap_overlay(img_resized, heatmap_grid)
        heatmap_base64 = to_base64_url(heatmap_overlay_rgb)

        # Compute Localization metrics & Overlay
        loc_res = compute_damage_localization(img_resized, heatmap_grid, category=secondary_label, confidence=secondary_conf)
        localized_overlay_rgb = loc_res["overlay_img"]
        localized_base64 = to_base64_url(localized_overlay_rgb)
        
        coverage_pct = loc_res["coverage_pct"]
        num_regions = loc_res["num_regions"]
        largest_region_pct = loc_res["largest_region_pct"]
        affected_area = loc_res["affected_area"]

        # 7. Severity Estimation (Explainable logic)
        severity = "None"
        if is_damaged:
            if secondary_label in ["glass", "bumper"] and secondary_conf > 0.85:
                severity = "Severe"
            elif secondary_label == "scratch" and secondary_conf < 0.80:
                severity = "Minor"
            else:
                severity = "Moderate"

        # 8. Safety Assessment Engine
        safety_res = SafetyAssessmentEngine.assess(
            category=secondary_label,
            severity=severity,
            num_regions=num_regions,
            coverage_pct=coverage_pct,
            is_damaged=is_damaged
        )
        roadworthy = safety_res["roadworthy"]
        night_safe = safety_res["night_driving_safe"]
        highway_safe = safety_res["highway_safe"]
        rain_driving_safe = safety_res["rain_driving_safe"]
        long_distance_safe = safety_res["long_distance_safe"]
        immediate_repair_required = safety_res["immediate_repair_required"]
        safety_reason = safety_res["reason"]

        # 9. Deterministic Health Score Calculation
        health_score, health_explanation, health_details = HealthScoreEngine.calculate_score(
            category=secondary_label,
            severity=severity,
            confidence=secondary_conf,
            coverage_pct=coverage_pct,
            num_regions=num_regions,
            safety_status=roadworthy,
            is_damaged=is_damaged
        )

        # 10. Repair Cost Engine
        cost_breakdown = RepairCostEngine.calculate_cost(
            category=secondary_label,
            severity=severity,
            num_regions=num_regions,
            coverage_pct=coverage_pct,
            is_damaged=is_damaged
        )

        # 11. Repair Time Engine
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

        # 12. Insurance Engine
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

        # 13. Maintenance Roadmap
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
        report_id = f"validauto-scan-{int(time.time() * 1000)}"
        response_data = {
            "id": report_id,
            "quality": quality,
            "ocr": ocr_res,
            "images": {
                "original": original_base64,
                "enhanced": enhanced_base64,
                "heatmap": heatmap_base64,
                "localized": localized_base64
            },
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
                "health_details": health_details,
                "severity": severity,
                "repair_costs": cost_breakdown,
                "repair_items": cost_breakdown.get("items", []),
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
                  "rain_driving_safe": rain_driving_safe,
                  "long_distance_safe": long_distance_safe,
                  "immediate_repair_required": immediate_repair_required,
                  "reason": safety_reason
                },
                "localization": {
                  "coverage_pct": coverage_pct,
                  "num_regions": num_regions,
                  "largest_region_pct": largest_region_pct,
                  "affected_area": affected_area
                },
                "maintenance": maintenance_roadmap,
                "description": get_damage_explanation(secondary_label, severity),
                "possible_cause": get_possible_cause(secondary_label, severity),
                "explanation": get_visual_explanation(secondary_label, severity),
                "timestamp": datetime.datetime.now().isoformat(),
                "inference_time_seconds": round(inference_time_1 + inference_time_2, 4)
            }
        }

        try:
            filepath = os.path.join(DB_DIR, f"{report_id}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(response_data, f, ensure_ascii=False, indent=2)
        except Exception as ex:
            print(f"[DB Error] Failed to save report JSON: {ex}")

        return response_data

    except Exception as e:
        print(f"[Error] Image processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

def format_currency(val: int):
    return f"₹{val:,}"

@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    filepath = os.path.join(DB_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read report: {str(e)}")

@app.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    filepath = os.path.join(DB_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        os.remove(filepath)
        return {"status": "success", "message": "Report deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")
