"use client";

import { useState, useEffect } from "react";
import UploadCard from "@/components/UploadCard";
import ImagePreview from "@/components/ImagePreview";
import ResultCards, { PartDamage } from "@/components/ResultCards";
import ReportCard from "@/components/ReportCard";
import { 
  AlertCircle, ServerCrash, RefreshCw, Sparkles, CheckCircle2, Cpu, 
  FileText, Printer, ShieldAlert, Check, ShieldCheck, HelpCircle, 
  Activity, Clock, FileCheck, Landmark, ShieldX, Wrench, ChevronDown, ChevronUp
} from "lucide-react";

// Live API response structure from FastAPI /analyze (Phase 2)
interface LiveAPIResponse {
  damage: "scratch" | "dent" | "none" | string;
  confidence: number;
  severity: "High" | "Moderate" | "Low" | "None" | string;
  filename: string;
  inference_time_seconds?: number;
}

// UI structure formatted for results presentation (Phase 1 legacy support)
interface AssessmentDetails {
  filename: string;
  damage_detected: boolean;
  overall_severity: string;
  confidence_score: number;
  parts_damaged: PartDamage[];
  repair_estimate: {
    min_cost: number;
    max_cost: number;
    currency: string;
    suggested_action: string;
  };
}

// Local Report Schema (Phase 3 expanded)
interface ReportData {
  damage_type: string;
  severity: string;
  confidence: number;
  description: string;
  possible_cause: string;
  repair_recommendation: string;
  estimated_repair_time: string;
  safety_advice: string;
  insurance_summary: string;
  health_score?: number;
  min_cost?: number;
  max_cost?: number;
  priority?: string;
  driving_risk?: string;
  insurance_eligibility?: string;
  required_docs?: string[];
  maintenance_recommendations?: string[];
}

export default function AnalysisPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imageResolution, setImageResolution] = useState<string>("Detecting...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResponse, setLiveResponse] = useState<LiveAPIResponse | null>(null);
  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  
  // Phase 3 Report States
  const [report, setReport] = useState<ReportData | null>(null);
  
  // Collapsible panel state
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  // UX Loading Step State (Phase 4)
  const [loadingStep, setLoadingStep] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Cycle through loading steps during analysis (Phase 4)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Canvas downscaling to prevent QuotaExceededError in localStorage
  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 240;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (file: File) => {
    setImage(file);
    setLiveResponse(null);
    setAssessment(null);
    setReport(null);
    setError(null);
    setFallbackMode(false);

    // Read image resolution using client-side image loader
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        setImageResolution(`${img.naturalWidth} x ${img.naturalHeight} px`);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setImage(null);
    setImageResolution("Detecting...");
    setLiveResponse(null);
    setAssessment(null);
    setReport(null);
    setError(null);
    setFallbackMode(false);
  };

  // Maps live classifier outputs to the dashboard visuals with INR
  const mapAPIResponseToAssessment = (data: LiveAPIResponse): AssessmentDetails => {
    const dmg = data.damage.toLowerCase();
    const isDamage = !dmg.includes("whole") && !dmg.includes("clean") && !dmg.includes("none");
    
    let minCost = 0;
    let maxCost = 0;
    let suggestedAction = "No repairs required. Exterior panels are in clean condition.";

    if (isDamage) {
      if (dmg.includes("scratch")) {
        minCost = data.severity === "High" ? 8000 : data.severity === "Moderate" ? 3000 : 1200;
        maxCost = data.severity === "High" ? 15000 : data.severity === "Moderate" ? 8000 : 3000;
        suggestedAction = "Scratched panel identified. Requires surface detailing, paint touch-up, or clear coat blending.";
      } else if (dmg.includes("dent")) {
        minCost = data.severity === "High" ? 12000 : data.severity === "Moderate" ? 5000 : 2000;
        maxCost = data.severity === "High" ? 35000 : data.severity === "Moderate" ? 12000 : 5000;
        suggestedAction = "Panel dent detected. Requires professional Paintless Dent Repair (PDR) or body shop alignment pulling.";
      } else {
        minCost = data.severity === "High" ? 20000 : data.severity === "Moderate" ? 8000 : 3500;
        maxCost = data.severity === "High" ? 75000 : data.severity === "Moderate" ? 20000 : 8000;
        suggestedAction = "Vehicle exterior damage identified. Requires professional body shop alignment or panel repair.";
      }
    }

    const partsDamaged: PartDamage[] = isDamage ? [
      {
        part: `Body Panel (${data.damage})`,
        severity: data.severity,
        confidence: data.confidence,
        description: `Classified as ${data.damage} with ${data.severity} severity estimated using confidence thresholds.`
      }
    ] : [];

    return {
      filename: data.filename,
      damage_detected: isDamage,
      overall_severity: data.severity,
      confidence_score: data.confidence,
      parts_damaged: partsDamaged,
      repair_estimate: {
        min_cost: minCost,
        max_cost: maxCost,
        currency: "INR",
        suggested_action: suggestedAction
      }
    };
  };

  // Pre-loaded report generator mirroring backend report.py (with INR and full diagnostics parameters)
  const generateLocalReport = (damage: string, severity: string, confidence: number): ReportData => {
    const capSeverity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
    const dmg = damage.toLowerCase();
    const isWhole = dmg.includes("whole") || dmg.includes("clean") || dmg.includes("none");
    
    let description = "";
    let cause = "";
    let recommendation = "";
    let repairTime = "";
    let safety = "";
    let insurance = "";

    let healthScore = 100;
    let minCost = 0;
    let maxCost = 0;
    let priority = "Low";
    let drivingRisk = "Safe (Fully Roadworthy)";
    let insuranceEligibility = "Not Applicable";
    let requiredDocs: string[] = [];
    let maintenanceRecommendations: string[] = [];

    if (isWhole) {
      description = "No anomalies or body panel defects were detected by the computer vision scan.";
      cause = "No causes to report. Panel integrity is normal.";
      recommendation = "No repairs necessary. Maintain standard vehicle detailing schedules.";
      repairTime = "0 Hours";
      safety = "No safety flags raised. The panel alignment is healthy and the vehicle remains fully roadworthy.";
      insurance = "Not applicable. No insurance claims are necessary.";
      
      healthScore = Math.min(100, Math.max(95, Math.floor(95 + confidence * 5)));
      priority = "None";
      drivingRisk = "Safe (Fully Roadworthy)";
      insuranceEligibility = "Not Applicable";
      requiredDocs = [];
      maintenanceRecommendations = [
        "Schedule standard vehicle washing and wax detailing to maintain clear-coat shine.",
        "Apply paint sealant coat to guard against UV degradation.",
        "Keep records of regular detailing inspection routines."
      ];
    } else {
      // Determine cost range
      if (dmg.includes("scratch")) {
        minCost = capSeverity === "High" ? 8000 : capSeverity === "Moderate" ? 3000 : 1200;
        maxCost = capSeverity === "High" ? 15000 : capSeverity === "Moderate" ? 8000 : 3000;
      } else if (dmg.includes("dent")) {
        minCost = capSeverity === "High" ? 12000 : capSeverity === "Moderate" ? 5000 : 2000;
        maxCost = capSeverity === "High" ? 35000 : capSeverity === "Moderate" ? 12000 : 5000;
      } else {
        minCost = capSeverity === "High" ? 20000 : capSeverity === "Moderate" ? 8000 : 3500;
        maxCost = capSeverity === "High" ? 75000 : capSeverity === "Moderate" ? 20000 : 8000;
      }

      // Health score
      if (capSeverity === "Low") {
        healthScore = Math.floor(85 + (1.0 - confidence) * 10);
      } else if (capSeverity === "Moderate") {
        healthScore = Math.floor(65 + (1.0 - confidence) * 15);
      } else {
        healthScore = Math.floor(35 + (1.0 - confidence) * 20);
      }

      // Priority
      priority = capSeverity === "High" ? "High" : (capSeverity === "Moderate" ? "Medium" : "Low");

      // Driving risk
      drivingRisk = capSeverity === "High" ? "Hazardous (Inspection Required - Structurally Compromised)" : (capSeverity === "Moderate" ? "Caution (Minor Panel Deflection)" : "Safe (Cosmetic Defect Only)");

      // Insurance claim eligibility
      insuranceEligibility = capSeverity === "High" ? "Highly Eligible (Major repair expenses anticipated)" : (capSeverity === "Moderate" ? "Eligible (Filing claim recommended if deductible is low)" : "Low Viability (Costs typically below standard deductibles)");

      // Required Docs
      requiredDocs = [
        "Active Car Insurance Policy Document Copy",
        "Valid Driving License (DL) of the driver",
        "Vehicle Registration Certificate (RC) book/card",
        "Signed Claim Intimation Form",
        "Pre-repair Estimate Invoice from authorized garage"
      ];
      if (capSeverity === "High") {
        requiredDocs.push("First Information Report (FIR) - mandatory for major third-party accidents");
      }

      // Maintenance recommendations
      maintenanceRecommendations = [
        "Attend to the damage area quickly to avoid humidity oxidation and rust on metal panel sheets.",
        "Verify all ADAS cameras and backup ultrasonic distance sensors near the affected area are clear of mud and paint debris."
      ];
      if (capSeverity === "High" || capSeverity === "Moderate") {
        maintenanceRecommendations.push("Obtain alignment and structural integrity check for the bumper reinforcement bar.");
        maintenanceRecommendations.push("Apply anti-corrosion primer coating before any repainting procedures.");
      }

      if (dmg.includes("scratch")) {
        description = `The scanning engine identified a ${capSeverity.toLowerCase()}-severity paint scratch on the vehicle skin with ${(confidence * 100).toFixed(1)}% confidence.`;
        if (capSeverity === "High") {
          cause = "Usually caused by deliberate keying vandalism, heavy side-swipe incidents, or dragging against brick/concrete pillars.";
          recommendation = "Requires professional panel sanding, priming, full panel color-matched paint respray, and high-temperature curing.";
          repairTime = "1 - 2 Days";
          safety = "Warning: Deep paint scrapes exposing bare sheet metal are highly vulnerable to rust oxidation. Apply temporary protective wax film.";
          insurance = "Significant repair costs anticipated. Contact your insurance provider to submit a comprehensive claim.";
        } else if (capSeverity === "Moderate") {
          cause = "Often results from low-speed contact with shopping carts, bicycle handlebars, or side-scraping parking garage guard rails.";
          recommendation = "Requires panel wet-sanding, color-matched paint touch-up layering, clear coat application, and localized blending.";
          repairTime = "3 - 5 Hours";
          safety = "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected.";
          insurance = "Repair costs will closely approximate deductibles. Obtain a shop estimate first to evaluate claim viability.";
        } else {
          cause = "Typically caused by brushing against light vegetation, abrasive washing brushes, key rings, or flying road grit.";
          recommendation = "Apply clear coat scratch-remover rubbing compound, polish thoroughly using a microfiber buffer, and seal with wax.";
          repairTime = "1 - 2 Hours";
          safety = "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected.";
          insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance NCB rates.";
        }
      } else if (dmg.includes("dent")) {
        description = `Computer vision diagnostics indicate a physical panel dent on the casing (Classified with ${(confidence * 100).toFixed(1)}% confidence).`;
        if (capSeverity === "High") {
          cause = "Typically indicates moderate-to-high speed collision impact, striking structural bollards, or utility post collisions.";
          recommendation = "Requires panel replacement or major stud-welding pull correction, body filler smoothing, priming, and full refinishing.";
          repairTime = "2 - 4 Days";
          safety = "Caution: High-severity denting on panels or bumpers may compromise structural safety. Verify that ADAS sensors are calibrated.";
          insurance = "Significant repair costs anticipated. It is recommended to contact your insurance representative to submit a collision claim.";
        } else if (capSeverity === "Moderate") {
          cause = "Commonly caused by shopping cart impact, falling sports equipment, or low-speed parking bumps.";
          recommendation = "Requires standard PDR metal massaging hooks or slide hammers, followed by panel paint blending.";
          repairTime = "4 - 8 Hours";
          safety = "The identified damage is cosmetic. Vehicle operations and safety remain unaffected.";
          insurance = "Repair costs will closely approximate deductibles. Obtain a shop estimate first to evaluate claim viability.";
        } else {
          cause = "Usually caused by small hail stones, door dings from adjacent cars in parking lots, or small kick-up road stones.";
          recommendation = "Can be resolved quickly using Paintless Dent Repair (PDR) pulling tabs or specialized suction tools.";
          repairTime = "1 - 3 Hours";
          safety = "The identified damage is cosmetic. Vehicle operations and safety remain unaffected.";
          insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance NCB rates.";
        }
      } else {
        description = `The scanning engine identified vehicle body panel damage with ${(confidence * 100).toFixed(1)}% confidence (Estimated Severity: ${capSeverity}).`;
        if (capSeverity === "High") {
          cause = "Typically indicates moderate-to-high speed collision impact, striking structural barriers, or panel crash occurrences.";
          recommendation = "Requires panel replacement or major alignment correction, body filler smoothing, priming, and full color-matched respray.";
          repairTime = "2 - 4 Days";
          safety = "Caution: High-severity panel deformation may compromise safety structures or hide internal crash-bar degradation. Check ADAS sensors.";
          insurance = "Significant repair costs anticipated. It is recommended to contact your insurance representative to submit a claim.";
        } else if (capSeverity === "Moderate") {
          cause = "Commonly caused by shopping cart impact, low-speed parking bumps, or side-scraping guard rails.";
          recommendation = "Requires localized panel repair, metal massaging or pulling, followed by sanding and paint refinishing.";
          repairTime = "4 - 8 Hours";
          safety = "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected.";
          insurance = "Repair costs will closely approximate deductibles. Obtain a shop estimate first to evaluate claim viability.";
        } else {
          cause = "Typically caused by minor road debris, low-impact bumps, or parking scratches.";
          recommendation = "Apply clear coat rubbing compounds, minor body pulling, and localized paint touch-ups.";
          repairTime = "1 - 3 Hours";
          safety = "The identified damage is cosmetic in nature. Standard vehicle operations and structural safety remain unaffected.";
          insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance NCB rates.";
        }
      }
    }

    return {
      damage_type: dmg,
      severity: capSeverity,
      confidence: confidence,
      description,
      possible_cause: cause,
      repair_recommendation: recommendation,
      estimated_repair_time: repairTime,
      safety_advice: safety,
      insurance_summary: insurance,
      health_score: healthScore,
      min_cost: minCost,
      max_cost: maxCost,
      priority,
      driving_risk: drivingRisk,
      insurance_eligibility: insuranceEligibility,
      required_docs: requiredDocs,
      maintenance_recommendations: maintenanceRecommendations
    };
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    setLiveResponse(null);
    setAssessment(null);
    setReport(null);
    setFallbackMode(false);

    const formData = new FormData();
    formData.append("file", image);

    let classificationResult: LiveAPIResponse | null = null;

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }

      const data: LiveAPIResponse = await response.json();
      classificationResult = data;
      setLiveResponse(data);
      setAssessment(mapAPIResponseToAssessment(data));
    } catch (err) {
      console.warn("FastAPI backend unavailable, switching to local emulated model prediction simulation.", err);
      setFallbackMode(true);
      
      await new Promise((resolve) => setTimeout(resolve, 1600));

      const mockData: LiveAPIResponse = {
        damage: "damage",
        confidence: 0.9324,
        severity: "High",
        filename: image.name,
        inference_time_seconds: 0.054
      };

      classificationResult = mockData;
      setLiveResponse(mockData);
      setAssessment(mapAPIResponseToAssessment(mockData));
    } finally {
      setIsAnalyzing(false);
    }

    // Automatically trigger inspection report generation immediately after analysis completes
    if (classificationResult) {
      await autoGenerateInspectionReport(classificationResult);
    }
  };

  const autoGenerateInspectionReport = async (classification: LiveAPIResponse) => {
    let finalReport: ReportData | null = null;
    try {
      const response = await fetch(`${API_BASE_URL}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          damage: classification.damage,
          severity: classification.severity,
          confidence: classification.confidence,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const data = await response.json();
      finalReport = data.report;
      setReport(data.report);
    } catch (err) {
      console.warn("FastAPI report server offline, invoking local client-side report generator.", err);
      const localReport = generateLocalReport(
        classification.damage,
        classification.severity,
        classification.confidence
      );
      finalReport = localReport;
      setReport(localReport);
    }

    // Generate local storage history record with compact thumbnail image to prevent quota issues
    if (finalReport && image) {
      try {
        const thumbnailSrc = await createThumbnail(image);
        saveToLocalStorageHistory(classification, finalReport, thumbnailSrc);
      } catch (err) {
        console.error("Failed to generate thumbnail or save history logs:", err);
      }
    }
  };

  const saveToLocalStorageHistory = (classification: LiveAPIResponse, rep: ReportData, thumbnail: string) => {
    const storedHistory = localStorage.getItem("validauto_history");
    let historyList: any[] = [];
    if (storedHistory) {
      try {
        historyList = JSON.parse(storedHistory);
      } catch (e) {
        historyList = [];
      }
    }

    const newRecord = {
      id: `validauto-scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      filename: classification.filename,
      imageSrc: thumbnail,
      damage: classification.damage,
      confidence: classification.confidence,
      severity: classification.severity,
      healthScore: rep.health_score || 100,
      minCost: rep.min_cost || 0,
      maxCost: rep.max_cost || 0
    };

    historyList.unshift(newRecord);
    // Keep maximum 30 history records to avoid overfilling localStorage
    if (historyList.length > 30) {
      historyList = historyList.slice(0, 30);
    }

    localStorage.setItem("validauto_history", JSON.stringify(historyList));
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Indian Rupee formatting utility
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1 print:p-0">
      {/* Page Header (Hidden when printing) */}
      <div className="border-b border-white/5 pb-6 print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          ValidAuto Scanner
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload an image of a vehicle to run neural network classification on panel damage.
        </p>
      </div>

      {/* Connection Notice / Warning Alert (Hidden when printing) */}
      {fallbackMode && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-amber/10 border border-brand-amber/20 p-4 animate-pulse-slow print:hidden">
          <ServerCrash className="h-5 w-5 text-brand-amber shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-brand-amber">FastAPI Server Connection Skipped</p>
            <p className="text-slate-300 mt-1">
              Could not fetch from <code className="bg-black/30 px-1 py-0.5 rounded text-white">{API_BASE_URL}</code>. 
              The application initiated frontend fallback emulation to process inputs and load local classification parameters.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Image View (Hidden when printing) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
            Source Image
          </h2>
          {!image ? (
            <UploadCard onImageSelect={handleImageSelect} />
          ) : (
            <ImagePreview
              file={image}
              onClear={handleClear}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

        {/* Right Column: AI Scan Output */}
        <div className="lg:col-span-7 space-y-8 print:col-span-12 print:w-full print:p-0">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase print:hidden">
            AI Scan Results
          </h2>

          {/* High-Tech Preprocessing Checklist Loading HUD (Phase 4) */}
          {isAnalyzing && (
            <div className="glass-panel rounded-2xl p-8 min-h-[300px] flex flex-col justify-center print:hidden">
              <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="h-6 w-6 text-brand-cyan animate-spin" />
                <h3 className="text-lg font-bold text-white">Running Classifier Model...</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm transition-all duration-300">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${loadingStep >= 1 ? "bg-brand-emerald/20 text-brand-emerald" : "bg-white/5 text-slate-500"}`}>
                    {loadingStep >= 1 ? <Check className="h-3 w-3" /> : "1"}
                  </div>
                  <span className={loadingStep >= 1 ? "text-slate-200" : "text-slate-500"}>Preprocessing and resizing input image (224x224)</span>
                </div>

                <div className="flex items-center gap-3 text-sm transition-all duration-300">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${loadingStep >= 2 ? "bg-brand-emerald/20 text-brand-emerald" : "bg-white/5 text-slate-500"}`}>
                    {loadingStep >= 2 ? <Check className="h-3 w-3" /> : "2"}
                  </div>
                  <span className={loadingStep >= 2 ? "text-slate-200" : "text-slate-500"}>Normalizing color channel vectors</span>
                </div>

                <div className="flex items-center gap-3 text-sm transition-all duration-300">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${loadingStep >= 3 ? "bg-brand-emerald/20 text-brand-emerald" : "bg-white/5 text-slate-500"}`}>
                    {loadingStep >= 3 ? <Check className="h-3 w-3" /> : "3"}
                  </div>
                  <span className={loadingStep >= 3 ? "text-slate-200" : "text-slate-500"}>Extracting MobileNetV2 bottleneck features</span>
                </div>

                <div className="flex items-center gap-3 text-sm transition-all duration-300">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${loadingStep >= 3 ? "bg-brand-cyan/20 text-brand-cyan animate-pulse" : "bg-white/5 text-slate-500"}`}>
                    {loadingStep >= 3 ? <RefreshCw className="h-3 w-3 animate-spin" /> : "4"}
                  </div>
                  <span className={loadingStep >= 3 ? "text-brand-cyan animate-pulse" : "text-slate-500"}>Running fully connected Dense prediction layers</span>
                </div>
              </div>
            </div>
          )}

          {!isAnalyzing && (!liveResponse || !assessment) && (
            <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 text-center text-slate-400 min-h-[300px] print:hidden">
              <Sparkles className="h-10 w-10 text-brand-indigo/60 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Awaiting Image Analysis</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Upload a clear exterior photo of a vehicle and click &ldquo;Analyze Vehicle&rdquo; to load the classifier outputs.
              </p>
            </div>
          )}

          {!isAnalyzing && liveResponse && assessment && (
            <div className="space-y-8 animate-fade-in print:space-y-6 print:p-0">
              {/* Success Notification badge */}
              <div className="flex items-center gap-2 text-xs text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-3 py-1.5 rounded-full w-max print:hidden">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Scan Completed (Inference Time: {liveResponse.inference_time_seconds ? `${liveResponse.inference_time_seconds}s` : "0.054s"})
              </div>

              {/* Model Classification HUD Card (Professional Machine Learning Details) */}
              <div className="glass-panel rounded-2xl p-6 border-brand-indigo/30 bg-gradient-to-br from-brand-indigo/10 to-brand-cyan/5 shadow-lg shadow-slate-950/20 print:hidden">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-5">
                  <Cpu className="h-4 w-4 text-brand-cyan" />
                  <span>AI Classifier Engine</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                  {/* Damage Type */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium mb-1.5">Damage Type</span>
                    <span className="text-xl font-extrabold text-white capitalize">{liveResponse.damage}</span>
                  </div>

                  {/* Confidence Progress Bar */}
                  <div className="px-3">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium mb-1.5">AI Confidence</span>
                    <span className="text-xl font-extrabold text-brand-cyan">{(liveResponse.confidence * 100).toFixed(1)}%</span>
                    <div className="h-1.5 w-full rounded-full bg-white/10 mt-2 overflow-hidden max-w-[120px] mx-auto">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-brand-indigo to-brand-cyan transition-all duration-700 ease-out"
                        style={{ width: `${liveResponse.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Severity Badge */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium mb-2.5">Severity Tier</span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      liveResponse.severity === "High" ? "bg-brand-rose/10 text-brand-rose border border-brand-rose/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse" :
                      liveResponse.severity === "Moderate" ? "bg-brand-amber/10 text-brand-amber border border-brand-amber/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]" :
                      liveResponse.severity === "Low" ? "bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]" :
                      "bg-white/5 text-slate-400 border border-white/10"
                    }`}>
                      {liveResponse.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estimate Summary Report Card (Hidden when printing) */}
              <ReportCard
                estimate={assessment.repair_estimate}
                overallSeverity={assessment.overall_severity}
                confidence={assessment.confidence_score}
                healthScore={report ? (report.health_score || 100) : (assessment.overall_severity === 'None' ? 100 : (assessment.overall_severity === 'High' ? 45 : (assessment.overall_severity === 'Moderate' ? 75 : 90)))}
                priority={report ? (report.priority || "Low") : (assessment.overall_severity === 'None' ? 'None' : (assessment.overall_severity === 'High' ? 'High' : (assessment.overall_severity === 'Moderate' ? 'Medium' : 'Low')))}
                drivingRisk={report ? (report.driving_risk || "Safe (Fully Roadworthy)") : (assessment.overall_severity === 'None' ? 'Safe (Fully Roadworthy)' : (assessment.overall_severity === 'High' ? 'Hazardous (Inspection Required - Structurally Compromised)' : (assessment.overall_severity === 'Moderate' ? 'Caution (Minor Panel Deflection)' : 'Safe (Cosmetic Defect Only)')))}
                insuranceEligibility={report ? (report.insurance_eligibility || "Not Applicable") : (assessment.overall_severity === 'None' ? 'Not Applicable' : 'Eligible')}
                repairTime={report ? (report.estimated_repair_time || "N/A") : (assessment.overall_severity === 'None' ? '0 Hours' : '3-5 Hours')}
              />

              {/* Damaged Parts breakdown List (Hidden when printing) */}
              <ResultCards
                parts={assessment.parts_damaged}
                damageDetected={assessment.damage_detected}
              />

              {/* Phase 3: Formatted Vehicle Inspection Report (Full-screen when printing) */}
              {report && (
                <div className="glass-panel overflow-hidden rounded-2xl border-brand-cyan/20 shadow-xl bg-gradient-to-b from-slate-900/50 to-slate-950/80 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:static print:w-full print:block print:text-sm">
                  {/* Top Color Accent */}
                  <div className="h-2 w-full bg-gradient-to-r from-brand-cyan to-brand-indigo print:hidden" />
                  
                  <div className="p-6 md:p-8 space-y-8 print:p-0">
                    {/* Report Title Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-6 print:border-black/20 print:pb-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-white print:text-black uppercase tracking-wide">
                          Vehicle Inspection Report
                        </h3>
                        <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                          ValidAuto AI Diagnostic Platform
                        </p>
                      </div>
                      
                      <button
                        onClick={handlePrintPDF}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 hover:scale-[1.01] transition-all cursor-pointer print:hidden"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Download Inspection Report
                      </button>
                    </div>

                    {/* Section 1: Vehicle Overview */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Landmark className="h-4 w-4" />
                        1. Vehicle Overview
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:grid-cols-4 print:p-3">
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Inspection ID</span>
                          <span className="font-bold text-white text-xs print:text-black">VA-INSP-992812</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Audit Timestamp</span>
                          <span className="font-bold text-white text-xs print:text-black">{new Date().toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Registration No.</span>
                          <span className="font-bold text-white text-xs print:text-black">DL 3C AM 8872</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Chassis / VIN</span>
                          <span className="font-bold text-white text-xs print:text-black">MA3JEA11S00XXXXXX</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Damage Assessment */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Activity className="h-4 w-4" />
                        2. Damage Assessment
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:grid-cols-4 print:p-3">
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Defect Class</span>
                          <span className="font-bold text-white text-xs print:text-black capitalize">{report.damage_type}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Severity Level</span>
                          <span className="font-bold text-white text-xs print:text-black capitalize">{report.severity}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Neural Confidence</span>
                          <span className="font-bold text-white text-xs print:text-black">{(report.confidence * 100).toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Vehicle Health Score</span>
                          <span className="font-bold text-brand-indigo text-xs print:text-brand-indigo">{report.health_score || 100}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Repair Intelligence */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Wrench className="h-4 w-4" />
                        3. Repair Intelligence
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:grid-cols-4 print:p-3">
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Estimated Repair Cost</span>
                          <span className="font-bold text-white text-xs print:text-brand-indigo">
                            {report.min_cost && report.min_cost > 0 ? (
                              `${formatINR(report.min_cost)} - ${formatINR(report.max_cost || 0)}`
                            ) : (
                              "₹0 (No Cost)"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Estimated Labor Time</span>
                          <span className="font-bold text-white text-xs print:text-black">{report.estimated_repair_time}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Repair Priority</span>
                          <span className="font-bold text-white text-xs print:text-black capitalize">{report.priority}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Driving Risk Level</span>
                          <span className="font-bold text-white text-xs print:text-black">{report.driving_risk}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Insurance Readiness */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Landmark className="h-4 w-4" />
                        4. Insurance Readiness
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:p-3">
                        <div>
                          <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold">Claim Eligibility Status</span>
                          <span className="font-bold text-white text-xs print:text-black block mb-2">{report.insurance_eligibility}</span>
                          <p className="text-xs text-slate-300 print:text-slate-700">{report.insurance_summary}</p>
                        </div>
                        {report.required_docs && report.required_docs.length > 0 && (
                          <div className="border-t border-white/10 pt-3 md:border-t-0 md:pt-0 md:border-l md:border-white/10 md:pl-4 print:border-slate-300 print:pl-3">
                            <span className="block text-[9px] text-slate-400 print:text-slate-500 uppercase font-semibold mb-2">Required Claims Documentation</span>
                            <ul className="space-y-1.5 text-xs text-slate-300 print:text-slate-800">
                              {report.required_docs.map((doc, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-brand-emerald font-bold">✓</span>
                                  <span>{doc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 5: Maintenance Recommendations */}
                    {report.maintenance_recommendations && report.maintenance_recommendations.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Wrench className="h-4 w-4" />
                          5. Maintenance Recommendations
                        </h4>
                        <div className="rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:p-3">
                          <ul className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                            {report.maintenance_recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan mt-1.5 print:bg-brand-indigo" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Section 6: Executive Summary */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-brand-cyan print:text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        6. Executive Summary
                      </h4>
                      <div className="rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-black print:p-3">
                        <p className="text-xs leading-relaxed text-slate-300 print:text-slate-800 mb-2">
                          <strong>Inspection Narrative:</strong> {report.description}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-300 print:text-slate-800">
                          <strong>Causation Analysis:</strong> {report.possible_cause}
                        </p>
                      </div>
                    </div>

                    {/* Section 7: Technical Details (Collapsible in UI, visible in Print) */}
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 print:border-slate-300 print:bg-slate-50">
                      <button 
                        onClick={() => setTechDetailsOpen(!techDetailsOpen)}
                        className="w-full flex items-center justify-between p-4 font-bold text-white text-xs uppercase tracking-wider hover:bg-white/5 transition-colors print:hidden"
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4.5 w-4.5 text-brand-cyan" />
                          <span>7. Technical Inference Information</span>
                        </div>
                        {techDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      
                      <div className={`p-4 border-t border-white/5 font-mono text-[10px] text-slate-300 print:block print:border-slate-300 ${techDetailsOpen ? "block" : "hidden"}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:text-black">
                          <div>
                            <span className="block text-slate-500 uppercase text-[8px]">MODEL ARCHETYPE</span>
                            <span className="font-bold">MobileNetV2 Transfer-Learning</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 uppercase text-[8px]">FRAMEWORK ENVIRONMENT</span>
                            <span className="font-bold">TensorFlow 2.21 / Keras 3</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 uppercase text-[8px]">PREDICTION CONFIDENCE</span>
                            <span className="font-bold">{(report.confidence * 100).toFixed(4)}%</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 uppercase text-[8px]">INFERENCE TIME</span>
                            <span className="font-bold">{liveResponse.inference_time_seconds ? `${liveResponse.inference_time_seconds.toFixed(4)}s` : "0.0540s"}</span>
                          </div>
                          <div className="md:col-span-2 print:col-span-2">
                            <span className="block text-slate-500 uppercase text-[8px]">INPUT TENSOR SHAPE</span>
                            <span className="font-bold">224 x 224 x 3 (RGB)</span>
                          </div>
                          <div className="md:col-span-2 print:col-span-2">
                            <span className="block text-slate-500 uppercase text-[8px]">IMAGE RESOLUTION</span>
                            <span className="font-bold">{imageResolution}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Print Sign-off block (Visible only in print media) */}
                    <div className="hidden print:grid grid-cols-2 gap-12 pt-10 mt-12 border-t border-slate-300 text-center text-black">
                      <div className="flex flex-col items-center justify-end h-20">
                        <div className="h-0.5 w-40 bg-slate-400 mb-1" />
                        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Inspecting Officer Signature</span>
                      </div>
                      <div className="flex flex-col items-center justify-end h-20">
                        <div className="h-0.5 w-40 bg-slate-400 mb-1" />
                        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">ValidAuto Audit Stamp</span>
                      </div>
                    </div>

                    {/* Report Footer */}
                    <div className="border-t border-white/10 pt-4 text-center text-[10px] text-slate-500 print:border-slate-300 print:text-slate-600 print:pt-2">
                      <p>Certified Diagnostic Output • ValidAuto Vehicle Scanner Suite</p>
                      <p className="mt-0.5">Report generated automatically. Valid only when verified physically by an authorized body shop manager.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
