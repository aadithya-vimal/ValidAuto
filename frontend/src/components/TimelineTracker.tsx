"use client";

import { CheckCircle2, Clock } from "lucide-react";

interface TimelineTrackerProps {
  currentStep: number; // 1: Form, 2: Upload, 3: Report
  isAnalyzing: boolean;
  isCompleted: boolean;
}

export default function TimelineTracker({ currentStep, isAnalyzing, isCompleted }: TimelineTrackerProps) {
  const steps = [
    { label: "Vehicle Details Intake", done: currentStep > 1 || isCompleted },
    { label: "Image Quality Audit", done: currentStep > 2 || (isCompleted && currentStep === 3) },
    { label: "Automatic Image Enhancement", done: isCompleted || (isAnalyzing && currentStep === 2) },
    { label: "Stage 4: Binary Detection Scan", done: isCompleted },
    { label: "Stage 5: Secondary Classification", done: isCompleted },
    { label: "Spatial Damage Localization", done: isCompleted },
    { label: "Deterministic Health Scoring", done: isCompleted },
    { label: "Configurable Repair Estimates", done: isCompleted },
    { label: "Safety & Claim Evaluation", done: isCompleted },
    { label: "Certificate Generated", done: isCompleted }
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:hidden">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-brand-cyan" />
        Inspection Processing Timeline
      </h4>
      <div className="relative border-l border-white/10 ml-3 pl-5 space-y-4 text-xs">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex items-center gap-2.5">
            {/* Step status circle */}
            <div className={`absolute -left-[26px] h-3 w-3 rounded-full border-2 ${
              step.done 
                ? "bg-brand-emerald border-brand-emerald shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                : "bg-slate-950 border-white/20"
            }`} />
            <span className={step.done ? "text-slate-200" : "text-slate-500 font-medium"}>
              {step.label}
            </span>
            {step.done && <CheckCircle2 className="h-3.5 w-3.5 text-brand-emerald shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
