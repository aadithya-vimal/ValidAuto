"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, AlertTriangle, ShieldCheck } from "lucide-react";

interface InspectionRecord {
  id: string;
  timestamp: string;
  filename: string; // Reg No
  ownerName: string;
  make?: string;
  modelName?: string;
  imageSrc: string;
  damage: string;
  confidence: number;
  severity: string;
  healthScore: number;
  minCost: number;
  maxCost: number;
}

interface InspectionComparerProps {
  records: InspectionRecord[];
}

export default function InspectionComparer({ records }: InspectionComparerProps) {
  const [recordAId, setRecordAId] = useState<string>("");
  const [recordBId, setRecordBId] = useState<string>("");

  const recordA = records.find((r) => r.id === recordAId);
  const recordB = records.find((r) => r.id === recordBId);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Generate dynamic comparative summary
  const getComparisonSummary = () => {
    if (!recordA || !recordB) return "Select two records to run comparative audit.";

    const healthDiff = recordB.healthScore - recordA.healthScore;
    const costDiff = recordA.minCost - recordB.minCost;

    if (healthDiff > 0) {
      return `Inspection Audit shows a significant restoration: Vehicle Health Index improved by +${healthDiff} points (from ${recordA.healthScore}/100 to ${recordB.healthScore}/100) and prospective repair liability was reduced by ${formatINR(costDiff)}.`;
    } else if (healthDiff < 0) {
      return `Inspection Audit shows degradation: Vehicle Health Index dropped by ${healthDiff} points (from ${recordA.healthScore}/100 to ${recordB.healthScore}/100). Additional cost exposure of ${formatINR(-costDiff)} calculated.`;
    } else {
      return `Inspection Audit shows static metrics: Vehicle Health remains at ${recordA.healthScore}/100 with consistent defect classes.`;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-5 print:hidden">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <ArrowLeftRight className="h-4 w-4 text-brand-cyan" />
        Inspection Comparative Analyzer
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector A */}
        <div className="space-y-1 text-xs">
          <label className="text-slate-500 font-bold uppercase tracking-wider block">Record A (e.g., Prior Audit)</label>
          <select
            value={recordAId}
            onChange={(e) => setRecordAId(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="">Select Audit Record</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.filename} - {r.ownerName} ({new Date(r.timestamp).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {/* Selector B */}
        <div className="space-y-1 text-xs">
          <label className="text-slate-500 font-bold uppercase tracking-wider block">Record B (e.g., Post Restoration)</label>
          <select
            value={recordBId}
            onChange={(e) => setRecordBId(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="">Select Audit Record</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.filename} - {r.ownerName} ({new Date(r.timestamp).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {recordA && recordB ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-5 text-xs">
            {/* Record A Panel */}
            <div className="border border-white/5 bg-black/20 p-4 rounded-xl space-y-2">
              <span className="block font-black text-slate-400 uppercase text-[9px]">Prior Status</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Damage Category</span><span className="font-bold text-white capitalize">{recordA.damage}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Severity</span><span className="font-bold text-white">{recordA.severity}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Health Index</span><span className="font-bold text-white">{recordA.healthScore}/100</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Quote</span><span className="font-bold text-white">{formatINR(recordA.minCost)}</span></div>
              </div>
            </div>

            {/* Record B Panel */}
            <div className="border border-white/5 bg-black/20 p-4 rounded-xl space-y-2">
              <span className="block font-black text-slate-400 uppercase text-[9px]">Post Status</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Damage Category</span><span className="font-bold text-white capitalize">{recordB.damage}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Severity</span><span className="font-bold text-white">{recordB.severity}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Health Index</span><span className="font-bold text-white">{recordB.healthScore}/100</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Quote</span><span className="font-bold text-white">{formatINR(recordB.minCost)}</span></div>
              </div>
            </div>
          </div>

          {/* Comparative Summary Box */}
          <div className="p-3.5 bg-brand-cyan/5 border border-brand-cyan/15 rounded-xl text-xs text-brand-cyan leading-relaxed flex items-start gap-2">
            <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p>{getComparisonSummary()}</p>
          </div>
        </div>
      ) : (
        <span className="text-xs text-slate-500 italic block text-center py-4">
          Select two records to run comparative evaluation.
        </span>
      )}
    </div>
  );
}
