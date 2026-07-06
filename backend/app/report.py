# backend/app/report.py

def resolve_type(damage_type: str) -> str:
    """
    Resolves dynamic class labels (e.g., '01-whole', '00-damage', 'clean') 
    to generic fallback keys ('none', 'damage') or specific templates.
    """
    dmg_lower = damage_type.lower()
    if any(w in dmg_lower for w in ["whole", "clean", "none"]):
        return "none"
    if dmg_lower in ["scratch", "dent"]:
        return dmg_lower
    return "damage"

def get_damage_description(damage_type: str, severity: str, confidence: float) -> str:
    """
    Formulates a detailed description of the identified vehicle condition based on prediction confidence.
    """
    resolved = resolve_type(damage_type)
    
    templates = {
        "scratch": [
            "A surface scrape has been detected on the vehicle exterior paneling. The damage primarily impacts the clear coat and base paint layers.",
            f"The scanning engine identified a {severity.lower()}-severity paint scratch on the vehicle skin with {confidence * 100:.1f}% confidence.",
            "Deep abrasion scratches were detected, penetrating the paint finish and exposing the underlying panel coating."
        ],
        "dent": [
            f"A localized metal surface indentation has been identified (Estimated Severity: {severity}). The structural outline of the panel is slightly distorted.",
            f"Computer vision diagnostics indicate a physical panel dent on the casing (Classified with {confidence * 100:.1f}% confidence).",
            "A high-impact deformation dent was detected, resulting in a significant panel cave-in and stretching of the metal profile."
        ],
        "none": [
            "No anomalies or body panel defects were detected by the computer vision scan.",
            "The vehicle panels show clean surface alignment and uniform paint layer reflectiveness.",
            "Visual inspection returns zero flags on surface scrapes or indentations."
        ],
        "damage": [
            "A surface scrape or structural indentation has been detected on the vehicle exterior paneling. The damage primarily impacts the clear coat, base paint, or panel profile.",
            f"The scanning engine identified a {severity.lower()}-severity body panel damage on the vehicle skin with {confidence * 100:.1f}% confidence.",
            "Significant deformation or deep paint abrasion was detected on the vehicle exterior, compromising panel alignment and surface integrity."
        ]
    }
    
    if resolved not in templates:
        return "Unknown vehicle panel condition classification."
        
    if resolved == "none":
        return templates["none"][0]
        
    idx = 1 if severity == "Moderate" else (0 if severity == "Low" else 2)
    return templates[resolved][idx]

def get_possible_cause(damage_type: str, severity: str) -> str:
    """
    Provides typical circumstances that cause the specified class and severity of damage.
    """
    resolved = resolve_type(damage_type)
    
    causes = {
        "scratch": {
            "Low": "Typically caused by brushing against light vegetation, abrasive washing brushes, key rings, or flying road grit.",
            "Moderate": "Often results from low-speed contact with shopping carts, bicycle handlebars, or side-scraping parking garage guard rails.",
            "High": "Usually caused by deliberate keying vandalism, heavy side swipe incidents, or dragging against brick/concrete pillars."
        },
        "dent": {
            "Low": "Usually caused by small hail stones, door dings from adjacent cars in parking lots, or small kick-up road stones.",
            "Moderate": "Commonly caused by shopping cart impact, falling sports equipment, or low-speed parking bumps.",
            "High": "Typically indicates moderate-to-high speed collision impact, striking structural bollards, or utility post collisions."
        },
        "none": {
            "None": "No causes to report. Panel integrity is normal."
        },
        "damage": {
            "Low": "Typically caused by low-impact bumps, brushing against light vegetation, abrasive washes, or flying road grit.",
            "Moderate": "Often results from low-speed contact with shopping carts, bicycle handlebars, parking barriers, or door dings.",
            "High": "Usually caused by high-impact collisions, sliding against guard rails, keying vandalism, or striking structural posts."
        }
    }
    
    if severity == "None" or resolved == "none":
        return causes["none"]["None"]
        
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    return causes.get(resolved, {}).get(sev_key, "Unknown cause factor.")

def get_repair_recommendation(damage_type: str, severity: str) -> str:
    """
    Provides practical repair instructions based on severity level.
    """
    resolved = resolve_type(damage_type)
    
    recommendations = {
        "scratch": {
            "Low": "Apply clear coat scratch-remover rubbing compound, polish thoroughly using a microfiber buffer, and seal with wax.",
            "Moderate": "Requires panel wet-sanding, color-matched paint touch-up layering, clear coat application, and localized blending.",
            "High": "Requires professional panel sanding, priming, full panel color-matched paint respray, and high-temperature curing."
        },
        "dent": {
            "Low": "Can be resolved quickly using Paintless Dent Repair (PDR) pulling tabs or specialized suction tools.",
            "Moderate": "Requires standard PDR metal massaging hooks or slide hammers, followed by panel paint blending.",
            "High": "Requires panel replacement or major stud-welding pull correction, body filler smoothing, priming, and full color-matched panel refinishing."
        },
        "none": {
            "None": "No repairs necessary. Maintain standard vehicle detailing schedules."
        },
        "damage": {
            "Low": "Apply clear coat rubbing compound, minor dent pulling tabs, and local paint touch-up to seal the affected area.",
            "Moderate": "Requires standard metal massaging (PDR) or localized body filler smoothing, followed by priming and paint blending.",
            "High": "Requires professional panel replacement or stud-welding pull correction, body filler, priming, respray, and high-temp curing."
        }
    }
    
    if severity == "None" or resolved == "none":
        return recommendations["none"]["None"]
        
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    return recommendations.get(resolved, {}).get(sev_key, "No repair details available.")

def get_repair_time(damage_type: str, severity: str) -> str:
    """
    Provides estimated labor duration.
    """
    resolved = resolve_type(damage_type)
    
    times = {
        "scratch": {"Low": "1 - 2 Hours", "Moderate": "3 - 5 Hours", "High": "1 - 2 Days"},
        "dent": {"Low": "1 - 3 Hours", "Moderate": "4 - 8 Hours", "High": "2 - 4 Days"},
        "none": {"None": "0 Hours"},
        "damage": {"Low": "1 - 3 Hours", "Moderate": "4 - 8 Hours", "High": "2 - 4 Days"}
    }
    
    if severity == "None" or resolved == "none":
        return times["none"]["None"]
        
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    return times.get(resolved, {}).get(sev_key, "Labor estimate unavailable.")

def get_safety_advice(damage_type: str, severity: str) -> str:
    """
    Offers safety guidelines regarding panel structural integrity.
    """
    resolved = resolve_type(damage_type)
    
    if resolved == "none" or severity == "None":
        return "No safety flags raised. The panel alignment is healthy and the vehicle remains fully roadworthy."
    
    if resolved in ["dent", "damage"] and severity == "High":
        return "Caution: High-severity denting on panels or bumpers may compromise structural safety rings or hide internal crash-bar degradation. Please have a technician inspect underlying components and verify that nearby ADAS radar sensors are calibrated before driving."
    
    if resolved == "scratch" and severity == "High":
        return "Warning: Deep paint scrapes exposing bare sheet metal are highly vulnerable to rust oxidation if exposed to rain or salt. We recommend applying a temporary protective wax film or primer seal until permanent refinishing can be scheduled."
        
    return "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected."

def get_insurance_summary(damage_type: str, severity: str) -> str:
    """
    Advises whether the cost makes filing an insurance claim worthwhile.
    """
    resolved = resolve_type(damage_type)
    
    if resolved == "none" or severity == "None":
        return "Not applicable. No insurance claims are necessary."
        
    if severity == "Low":
        return "The repair cost is highly likely to be below standard comprehensive insurance deductibles (typically ₹2,000 - ₹5,000 in India). Paying out-of-pocket is advised to avoid claims record marks and keep your No Claim Bonus (NCB) discount."
        
    if severity == "Moderate":
        return "Repair costs will closely approximate typical comprehensive policy deductibles. We recommend obtaining a written estimate from an authorized garage first to determine if filing a claim is financially logical."
        
    return "Significant repair costs anticipated. It is recommended to contact your insurance representative to submit a comprehensive or collision claim. Attach this automated inspection report and original damage photos as evidence."

def generate_report_dict(damage_type: str, severity: str, confidence: float) -> dict:
    """
    Main generator combining all template helpers into a clean, comprehensive diagnostic dictionary.
    """
    damage_type = damage_type.lower()
    severity = severity.capitalize() if severity.lower() != "none" else "None"
    resolved = resolve_type(damage_type)
    
    # Calculate Health Score (0-100)
    if resolved == "none" or severity == "None":
        health_score = int(95 + confidence * 5)
        health_score = min(100, max(95, health_score))
    else:
        if severity == "Low":
            health_score = int(85 + (1.0 - confidence) * 10)
        elif severity == "Moderate":
            health_score = int(65 + (1.0 - confidence) * 15)
        else:
            health_score = int(35 + (1.0 - confidence) * 20)
            
    # Calculate Repair Costs in Indian Rupees (₹)
    if resolved == "none" or severity == "None":
        min_cost = 0
        max_cost = 0
    elif resolved == "scratch":
        min_cost = 8000 if severity == "High" else (3000 if severity == "Moderate" else 1200)
        max_cost = 15000 if severity == "High" else (8000 if severity == "Moderate" else 3000)
    elif resolved == "dent":
        min_cost = 12000 if severity == "High" else (5000 if severity == "Moderate" else 2000)
        max_cost = 35000 if severity == "High" else (12000 if severity == "Moderate" else 5000)
    else: # general damage
        min_cost = 20000 if severity == "High" else (8000 if severity == "Moderate" else 3500)
        max_cost = 75000 if severity == "High" else (20000 if severity == "Moderate" else 8000)

    # Priority
    priority = "Low" if severity == "Low" else ("Medium" if severity == "Moderate" else ("High" if severity == "High" else "Low"))
    if resolved == "none":
        priority = "None"
        
    # Driving Risk
    if resolved == "none" or severity == "None":
        driving_risk = "Safe (Fully Roadworthy)"
    elif severity == "Low":
        driving_risk = "Safe (Cosmetic Defect Only)"
    elif severity == "Moderate":
        driving_risk = "Caution (Minor Panel Deflection)"
    else:
        driving_risk = "Hazardous (Inspection Required - Structurally Compromised)"
        
    # Insurance Claim Eligibility
    if resolved == "none" or severity == "None":
        insurance_eligibility = "Not Applicable"
    elif severity == "Low":
        insurance_eligibility = "Low Viability (Costs typically below standard deductibles)"
    elif severity == "Moderate":
        insurance_eligibility = "Eligible (Filing claim recommended if deductible is low)"
    else:
        insurance_eligibility = "Highly Eligible (Major repair expenses anticipated)"
        
    # Required Insurance Documents
    if resolved == "none" or severity == "None":
        required_docs = []
    else:
        required_docs = [
            "Active Car Insurance Policy Document Copy",
            "Valid Driving License (DL) of the driver",
            "Vehicle Registration Certificate (RC) book/card",
            "Signed Claim Intimation Form",
            "Pre-repair Estimate Invoice from authorized garage"
        ]
        if severity == "High":
            required_docs.append("First Information Report (FIR) - mandatory for major third-party accidents")

    # Maintenance Recommendations
    if resolved == "none" or severity == "None":
        recommendations = [
            "Schedule standard vehicle washing and wax detailing to maintain clear-coat shine.",
            "Apply paint sealant coat to guard against UV degradation.",
            "Keep records of regular detailing inspection routines."
        ]
    else:
        recommendations = [
            "Attend to the damage area quickly to avoid humidity oxidation and rust on metal panel sheets.",
            "Verify all ADAS cameras and backup ultrasonic distance sensors near the affected area are clear of mud and paint debris."
        ]
        if severity == "High" or severity == "Moderate":
            recommendations.append("Obtain alignment and structural integrity check for the bumper reinforcement bar.")
            recommendations.append("Apply anti-corrosion primer coating before any repainting procedures.")

    return {
        "damage_type": damage_type,
        "severity": severity,
        "confidence": confidence,
        "description": get_damage_description(damage_type, severity, confidence),
        "possible_cause": get_possible_cause(damage_type, severity),
        "repair_recommendation": get_repair_recommendation(damage_type, severity),
        "estimated_repair_time": get_repair_time(damage_type, severity),
        "safety_advice": get_safety_advice(damage_type, severity),
        "insurance_summary": get_insurance_summary(damage_type, severity),
        "health_score": health_score,
        "min_cost": min_cost,
        "max_cost": max_cost,
        "priority": priority,
        "driving_risk": driving_risk,
        "insurance_eligibility": insurance_eligibility,
        "required_docs": required_docs,
        "maintenance_recommendations": recommendations
    }
