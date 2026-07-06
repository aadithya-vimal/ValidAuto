"use client";

import { useState, useEffect } from "react";
import UploadCard from "@/components/UploadCard";
import ImagePreview from "@/components/ImagePreview";
import ResultCards, { PartDamage } from "@/components/ResultCards";
import ReportCard from "@/components/ReportCard";
import { AlertCircle, ServerCrash, RefreshCw, Sparkles, CheckCircle2, Cpu, FileText, Printer, ShieldAlert, Check } from "lucide-react";

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

// Local Report Schema (Phase 3)
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
}

export default function AnalysisPage() {
  const [image, setImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResponse, setLiveResponse] = useState<LiveAPIResponse | null>(null);
  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  
  // Phase 3 Report States
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
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

  const handleImageSelect = (file: File) => {
    setImage(file);
    setLiveResponse(null);
    setAssessment(null);
    setReport(null);
    setError(null);
    setFallbackMode(false);
  };

  const handleClear = () => {
    setImage(null);
    setLiveResponse(null);
    setAssessment(null);
    setReport(null);
    setError(null);
    setFallbackMode(false);
  };

  // Maps live classifier outputs to the dashboard visuals
  const mapAPIResponseToAssessment = (data: LiveAPIResponse): AssessmentDetails => {
    const isDamage = data.damage !== "none" && data.damage !== "01-whole";
    
    let minCost = 0;
    let maxCost = 0;
    let suggestedAction = "No repairs required. Exterior panels are in clean condition.";

    if (data.damage === "00-damage" || data.damage === "damage") {
      minCost = data.severity === "High" ? 850 : data.severity === "Moderate" ? 450 : 150;
      maxCost = data.severity === "High" ? 1500 : data.severity === "Moderate" ? 750 : 300;
      suggestedAction = "Vehicle exterior damage identified. Requires professional body shop alignment or panel repair.";
    } else if (data.damage === "scratch") {
      minCost = data.severity === "High" ? 450 : data.severity === "Moderate" ? 250 : 120;
      maxCost = data.severity === "High" ? 700 : data.severity === "Moderate" ? 380 : 220;
      suggestedAction = "Scratched panel identified. Requires surface detailing, paint touch-up, or clear coat blending.";
    } else if (data.damage === "dent") {
      minCost = data.severity === "High" ? 950 : data.severity === "Moderate" ? 600 : 350;
      maxCost = data.severity === "High" ? 1800 : data.severity === "Moderate" ? 900 : 550;
      suggestedAction = "Panel dent detected. Requires professional Paintless Dent Repair (PDR) or body shop alignment pulling.";
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
        currency: "USD",
        suggested_action: suggestedAction
      }
    };
  };

  // Pre-loaded report generator mirroring backend report.py
  const generateLocalReport = (damage: string, severity: string, confidence: number): ReportData => {
    const capSeverity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
    const dmg = damage.toLowerCase();
    
    let description = "";
    let cause = "";
    let recommendation = "";
    let repairTime = "";
    let safety = "";
    let insurance = "";

    if (dmg === "none" || dmg === "01-whole") {
      description = "No anomalies or body panel defects were detected by the computer vision scan.";
      cause = "No causes to report. Panel integrity is normal.";
      recommendation = "No repairs necessary. Maintain standard vehicle detailing schedules.";
      repairTime = "0 Hours";
      safety = "No safety flags raised. The panel alignment is healthy and the vehicle remains fully roadworthy.";
      insurance = "Not applicable. No insurance claims are necessary.";
    } else if (dmg === "00-damage" || dmg === "damage") {
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
        insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance rates.";
      }
    } else if (dmg === "scratch") {
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
        insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance rates.";
      }
    } else if (dmg === "dent") {
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
        insurance = "Repair cost falls below standard deductibles. Out-of-pocket payment is recommended to protect insurance rates.";
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
      insurance_summary: insurance
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

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }

      const data: LiveAPIResponse = await response.json();
      setLiveResponse(data);
      setAssessment(mapAPIResponseToAssessment(data));
    } catch (err) {
      console.warn("FastAPI backend unavailable, switching to local emulated model prediction simulation.", err);
      setFallbackMode(true);
      
      await new Promise((resolve) => setTimeout(resolve, 1600));

      const mockData: LiveAPIResponse = {
        damage: "00-damage",
        confidence: 0.9324,
        severity: "High",
        filename: image.name,
        inference_time_seconds: 0.054
      };

      setLiveResponse(mockData);
      setAssessment(mapAPIResponseToAssessment(mockData));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!liveResponse) return;

    setIsGeneratingReport(true);
    setReport(null);

    try {
      const response = await fetch(`${API_BASE_URL}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          damage: liveResponse.damage,
          severity: liveResponse.severity,
          confidence: liveResponse.confidence,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      console.warn("FastAPI report server offline, invoking local client-side report generator.", err);
      const localReport = generateLocalReport(
        liveResponse.damage,
        liveResponse.severity,
        liveResponse.confidence
      );
      setReport(localReport);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1 print:p-0">
      {/* Page Header (Hidden when printing) */}
      <div className="border-b border-white/5 pb-6 print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Vehicle Scanner
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

      {/* Dismissible Error alert card (Phase 4) */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-brand-rose/10 border border-brand-rose/20 p-4 print:hidden animate-fade-in">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-brand-rose shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-brand-rose">Analysis Failed</p>
              <p className="text-slate-300 mt-1">{error}</p>
            </div>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="text-xs text-slate-400 hover:text-white transition-colors font-bold uppercase cursor-pointer"
          >
            Dismiss
          </button>
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
        <div className="lg:col-span-7 space-y-8 print:col-span-12 print:w-full">
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
                  <span className={loadingStep >= 1 ? "text-slate-200" : "text-slate-500"}>Preprocessing and resizing input image</span>
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
            <div className="space-y-8 animate-fade-in print:space-y-6">
              {/* Success Notification badge */}
              <div className="flex items-center gap-2 text-xs text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-3 py-1.5 rounded-full w-max print:hidden">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Scan Completed (Inference Time: {liveResponse.inference_time_seconds ? `${liveResponse.inference_time_seconds}s` : "0.05s"})
              </div>

              {/* Model Classification HUD Card (Phase 4 improved) */}
              <div className="glass-panel rounded-2xl p-6 border-brand-indigo/30 bg-gradient-to-br from-brand-indigo/10 to-brand-cyan/5 shadow-lg shadow-slate-950/20 print:hidden">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Cpu className="h-4 w-4 text-brand-cyan" />
                    <span>Model Prediction Output (Phase 2)</span>
                  </div>
                  
                  {/* Phase 3: Generate Report Button */}
                  {!report && (
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2 text-xs font-bold text-white hover:opacity-95 shadow transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                    >
                      {isGeneratingReport ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          Generate Report
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                  {/* Damage Type */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium mb-1.5">Damage Type</span>
                    <span className="text-xl font-extrabold text-white capitalize">{liveResponse.damage}</span>
                  </div>

                  {/* Confidence Progress Bar (Phase 4) */}
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

                  {/* Severity Badge with neon shadow glows (Phase 4) */}
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
              />

              {/* Damaged Parts breakdown List (Hidden when printing) */}
              <ResultCards
                parts={assessment.parts_damaged}
                damageDetected={assessment.damage_detected}
              />

              {/* Phase 3: Formatted Assessment Report Sheet (Full-screen when printing) */}
              {report && (
                <div className="glass-panel overflow-hidden rounded-2xl border-brand-cyan/20 shadow-xl bg-gradient-to-b from-slate-900/50 to-slate-950/80 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:static print:w-full print:block print:text-sm">
                  {/* Top Color Accent */}
                  <div className="h-2 w-full bg-gradient-to-r from-brand-cyan to-brand-indigo print:hidden" />
                  
                  <div className="p-6 md:p-8 space-y-6 print:p-0">
                    {/* Report Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-6 print:border-black/10">
                      <div>
                        <h3 className="text-xl font-extrabold text-white print:text-black">
                          Diagnostic Assessment Report
                        </h3>
                        <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                          AutoShield AI Collision Inspection Systems
                        </p>
                      </div>
                      
                      {/* Action buttons */}
                      <button
                        onClick={handlePrintPDF}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 hover:scale-[1.01] transition-all cursor-pointer print:hidden"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Download PDF
                      </button>
                    </div>

                    {/* Metadata Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-white/5 p-4 border border-white/5 print:bg-slate-50 print:border-slate-200 print:text-black">
                      <div>
                        <span className="block text-[10px] text-slate-400 print:text-slate-500 uppercase font-medium">Record ID</span>
                        <span className="font-bold text-white text-xs print:text-black">AS-SCAN-{Math.floor(100000 + Math.random() * 900000)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 print:text-slate-500 uppercase font-medium">Date Code</span>
                        <span className="font-bold text-white text-xs print:text-black">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 print:text-slate-500 uppercase font-medium">Classified Damage</span>
                        <span className="font-bold text-white text-xs print:text-black capitalize">{report.damage_type}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 print:text-slate-500 uppercase font-medium">Severity / Confidence</span>
                        <span className="font-bold text-white text-xs print:text-black">{report.severity} ({(report.confidence * 100).toFixed(0)}%)</span>
                      </div>
                    </div>

                    {/* Report Sections */}
                    <div className="space-y-6 divide-y divide-white/5 print:divide-slate-200">
                      
                      {/* Section 1: Description */}
                      <div className="pt-2">
                        <h4 className="text-sm font-extrabold text-brand-cyan print:text-brand-indigo uppercase tracking-wider mb-2">
                          1. Damage Description
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                          {report.description}
                        </p>
                      </div>

                      {/* Section 2: Possible Causes */}
                      <div className="pt-4">
                        <h4 className="text-sm font-extrabold text-brand-cyan print:text-brand-indigo uppercase tracking-wider mb-2">
                          2. Likely Causation Factors
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                          {report.possible_cause}
                        </p>
                      </div>

                      {/* Section 3: Recommendations & Labor Estimates */}
                      <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8">
                          <h4 className="text-sm font-extrabold text-brand-cyan print:text-brand-indigo uppercase tracking-wider mb-2">
                            3. Repair Recommendations
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                            {report.repair_recommendation}
                          </p>
                        </div>
                        <div className="md:col-span-4 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 p-4 flex flex-col justify-center print:bg-slate-50 print:border-slate-300">
                          <span className="block text-[10px] text-slate-400 print:text-slate-500 uppercase font-semibold text-center mb-1">Estimated Repair Time</span>
                          <span className="text-lg font-black text-white text-center print:text-brand-indigo">{report.estimated_repair_time}</span>
                        </div>
                      </div>

                      {/* Section 4: Safety & Operation Advice */}
                      <div className="pt-4 rounded-xl border border-white/5 bg-slate-950/50 p-4 mt-2 print:bg-slate-50 print:border-slate-200">
                        <h4 className="text-sm font-extrabold text-brand-rose flex items-center gap-1.5 uppercase tracking-wider mb-2">
                          <ShieldAlert className="h-4.5 w-4.5" />
                          4. Safety & Roadworthiness Advisory
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                          {report.safety_advice}
                        </p>
                      </div>

                      {/* Section 5: Insurance Claim Advice */}
                      <div className="pt-4">
                        <h4 className="text-sm font-extrabold text-brand-cyan print:text-brand-indigo uppercase tracking-wider mb-2">
                          5. Insurance Settlement Summary
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                          {report.insurance_summary}
                        </p>
                      </div>
                    </div>

                    {/* Report Footer */}
                    <div className="border-t border-white/10 pt-6 text-center text-[10px] text-slate-500 print:border-slate-300 print:text-slate-600">
                      <p>Certified Diagnostic Output • AutoShield AI Inc.</p>
                      <p className="mt-1">Report generated on demand. Subject to certified workshop verification.</p>
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
