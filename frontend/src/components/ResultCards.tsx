"use client";

import { AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

export interface PartDamage {
  part: string;
  severity: "High" | "Moderate" | "Low" | string;
  confidence: number;
  description: string;
}

interface ResultCardsProps {
  parts: PartDamage[];
  damageDetected: boolean;
}

export default function ResultCards({ parts, damageDetected }: ResultCardsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-brand-rose/10 text-brand-rose border-brand-rose/20";
      case "moderate":
        return "bg-brand-amber/10 text-brand-amber border-brand-amber/20";
      case "low":
        return "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20";
      default:
        return "bg-white/5 text-slate-400 border-white/10";
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className={`glass-panel flex items-start gap-4 rounded-2xl p-6 border-l-4 ${
        damageDetected ? "border-l-brand-amber" : "border-l-brand-emerald"
      }`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          damageDetected ? "bg-brand-amber/10 text-brand-amber" : "bg-brand-emerald/10 text-brand-emerald"
        }`}>
          {damageDetected ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {damageDetected ? "Damage Detected" : "No Damage Detected"}
          </h3>
          <p className="text-sm text-slate-400">
            {damageDetected
              ? "Multiple anomalies were flagged by the AI engine. See the detailed breakdown below."
              : "The scan returned clear. No notable damage was detected on the exterior paneling."}
          </p>
        </div>
      </div>

      {/* Part List */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
          Damage Breakdown
        </h4>

        {parts.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-8 text-center text-slate-400">
            <HelpCircle className="mb-2 h-8 w-8 text-slate-500" />
            <p className="text-sm">No specific parts flagged in the report.</p>
          </div>
        ) : (
          parts.map((item, idx) => (
            <div
              key={`${item.part}-${idx}`}
              className="glass-panel glass-panel-hover rounded-2xl p-6 transition-all duration-300"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Part Name & Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-bold text-white">{item.part}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${getSeverityColor(item.severity)}`}>
                      {item.severity} Severity
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {item.description}
                  </p>
                </div>

                {/* Confidence Meter */}
                <div className="w-full sm:w-44 shrink-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Confidence Score</span>
                    <span className="text-brand-cyan font-bold">{(item.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-indigo to-brand-cyan"
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
