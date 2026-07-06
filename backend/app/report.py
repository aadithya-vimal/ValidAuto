# backend/app/report.py

def get_damage_description(damage_type: str, severity: str, confidence: float) -> str:
    """
    Formulates a detailed description of the identified vehicle condition based on prediction confidence.
    """
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
        ]
    }
    
    if damage_type not in templates:
        return "Unknown vehicle panel condition classification."
        
    # Select template index based on severity
    if damage_type == "none":
        return templates["none"][0]
    idx = 1 if severity == "Moderate" else (0 if severity == "Low" else 2)
    return templates[damage_type][idx]

def get_possible_cause(damage_type: str, severity: str) -> str:
    """
    Provides typical circumstances that cause the specified class and severity of damage.
    """
    causes = {
        "scratch": {
            "Low": "Typically caused by brushing against light vegetation, abrasive washing brushes, key rings, or flying road grit.",
            "Moderate": "Often results from low-speed contact with shopping carts, bicycle handlebars, or side-scraping parking garage guard rails.",
            "High": "Usually caused by deliberate keying vandalism, heavy side-swipe incidents, or dragging against brick/concrete pillars."
        },
        "dent": {
            "Low": "Usually caused by small hail stones, door dings from adjacent cars in parking lots, or small kick-up road stones.",
            "Moderate": "Commonly caused by shopping cart impact, falling sports equipment, or low-speed parking bumps.",
            "High": "Typically indicates moderate-to-high speed collision impact, striking structural bollards, or utility post collisions."
        },
        "none": {
            "Low": "No causes to report. Panel integrity is normal.",
            "Moderate": "No causes to report. Panel integrity is normal.",
            "High": "No causes to report. Panel integrity is normal.",
            "None": "No causes to report. Panel integrity is normal."
        }
    }
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    if severity == "None" or damage_type == "none":
        return causes["none"]["None"]
    return causes.get(damage_type, {}).get(sev_key, "Unknown cause factor.")

def get_repair_recommendation(damage_type: str, severity: str) -> str:
    """
    Provides practical repair instructions based on severity level.
    """
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
            "Low": "No repairs necessary. Maintain standard vehicle detailing schedules.",
            "Moderate": "No repairs necessary. Maintain standard vehicle detailing schedules.",
            "High": "No repairs necessary. Maintain standard vehicle detailing schedules.",
            "None": "No repairs necessary. Maintain standard vehicle detailing schedules."
        }
    }
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    if severity == "None" or damage_type == "none":
        return recommendations["none"]["None"]
    return recommendations.get(damage_type, {}).get(sev_key, "No repair details available.")

def get_repair_time(damage_type: str, severity: str) -> str:
    """
    Provides estimated labor duration.
    """
    times = {
        "scratch": {"Low": "1 - 2 Hours", "Moderate": "3 - 5 Hours", "High": "1 - 2 Days"},
        "dent": {"Low": "1 - 3 Hours", "Moderate": "4 - 8 Hours", "High": "2 - 4 Days"},
        "none": {"Low": "0 Hours", "Moderate": "0 Hours", "High": "0 Hours", "None": "0 Hours"}
    }
    sev_key = severity if severity in ["Low", "Moderate", "High"] else "Low"
    if severity == "None" or damage_type == "none":
        return times["none"]["None"]
    return times.get(damage_type, {}).get(sev_key, "Labor estimate unavailable.")

def get_safety_advice(damage_type: str, severity: str) -> str:
    """
    Offers safety guidelines regarding panel structural integrity.
    """
    if damage_type == "none" or severity == "None":
        return "No safety flags raised. The panel alignment is healthy and the vehicle remains fully roadworthy."
    
    if damage_type == "dent" and severity == "High":
        return "Caution: High-severity denting on panels or bumpers may compromise structural safety rings or hide internal crash-bar degradation. Please have a technician inspect underlying components and verify that nearby ADAS radar sensors are calibrated before driving."
    
    if damage_type == "scratch" and severity == "High":
        return "Warning: Deep paint scrapes exposing bare sheet metal are highly vulnerable to rust oxidation if exposed to rain or salt. We recommend applying a temporary protective wax film or primer seal until permanent refinishing can be scheduled."
        
    return "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected."

def get_insurance_summary(damage_type: str, severity: str) -> str:
    """
    Advises whether the cost makes filing an insurance claim worthwhile.
    """
    if damage_type == "none" or severity == "None":
        return "Not applicable. No insurance claims are necessary."
        
    if severity == "Low":
        return "The repair cost is highly likely to be below standard insurance deductibles ($500 - $1,000). Paying out-of-pocket is advised to avoid claims record marks and potential premium raises."
        
    if severity == "Moderate":
        return "Repair costs will closely approximate typical comprehensive deductibles. We recommend obtaining a written estimate from a shop first to determine if filing a claim is financially logical."
        
    return "Significant repair costs anticipated. It is recommended to contact your insurance representative to submit a comprehensive or collision claim. Attach this automated inspection report and original damage photos as evidence."

def generate_report_dict(damage_type: str, severity: str, confidence: float) -> dict:
    """
    Main generator combining all template helpers into a clean, comprehensive diagnostic dictionary.
    """
    damage_type = damage_type.lower()
    severity = severity.capitalize() if severity.lower() != "none" else "None"
    
    return {
        "damage_type": damage_type,
        "severity": severity,
        "confidence": confidence,
        "description": get_damage_description(damage_type, severity, confidence),
        "possible_cause": get_possible_cause(damage_type, severity),
        "repair_recommendation": get_repair_recommendation(damage_type, severity),
        "estimated_repair_time": get_repair_time(damage_type, severity),
        "safety_advice": get_safety_advice(damage_type, severity),
        "insurance_summary": get_insurance_summary(damage_type, severity)
    }
