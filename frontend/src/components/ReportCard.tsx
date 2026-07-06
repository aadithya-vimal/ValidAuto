"use client";

import { FileText, Printer, ShieldAlert, Hammer, Activity, ShieldCheck, Clock, ShieldX, IndianRupee } from "lucide-react";

interface RepairEstimate {
  min_cost: number;
  max_cost: number;
  currency: string;
  suggested_action: string;
}

interface ReportCardProps {
  estimate: RepairEstimate;
  overallSeverity: string;
  confidence: number;
  healthScore: number;
  priority: string;
  drivingRisk: string;
  insuranceEligibility: string;
  repairTime: string;
}

export default function ReportCard({
  estimate,
  overallSeverity,
  confidence,
  healthScore,
  priority,
  drivingRisk,
  insuranceEligibility,
  repairTime,
}: ReportCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  // Health Score Color
  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20";
    if (score >= 70) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-brand-rose bg-brand-rose/10 border-brand-rose/20";
  };

  // Priority Color
  const getPriorityColor = (p: string) => {
    const pLower = p.toLowerCase();
    if (pLower.includes("high") || pLower.includes("critical")) return "text-brand-rose bg-brand-rose/10 border-brand-rose/20";
    if (pLower.includes("medium") || pLower.includes("mod")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20";
  };

  // Risk Color
  const getRiskColor = (risk: string) => {
    const rLower = risk.toLowerCase();
    if (rLower.includes("hazard") || rLower.includes("danger")) return "text-brand-rose bg-brand-rose/10 border-brand-rose/20";
    if (rLower.includes("caution") || rLower.includes("warn")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20";
  };

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-brand-indigo/20 shadow-xl shadow-slate-950/50 print:hidden">
      {/* Accent Top Bar */}
      <div className="h-2 w-full bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-cyan" />

      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-indigo/10 text-brand-indigo">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Assessment Summary</h3>
              <p className="text-xs text-slate-400">ValidAuto Professional Inspection Summary</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Health Score */}
          <div className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${getHealthColor(healthScore)}`}>
            <Activity className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Health Score</span>
              <span className="block text-2xl font-black">{healthScore}/100</span>
            </div>
          </div>

          {/* Repair Priority */}
          <div className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${getPriorityColor(priority)}`}>
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Repair Priority</span>
              <span className="block text-xl font-black capitalize">{priority}</span>
            </div>
          </div>

          {/* Driving Risk */}
          <div className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${getRiskColor(drivingRisk)}`}>
            <ShieldX className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Driving Risk</span>
              <span className="block text-sm font-extrabold leading-tight mt-0.5">{drivingRisk.split(" ")[0]}</span>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3 text-white">
            <IndianRupee className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Est. Repair Cost</span>
              <span className="block text-lg font-bold">
                {estimate.min_cost > 0 ? (
                  `${formatCurrency(estimate.min_cost)} - ${formatCurrency(estimate.max_cost)}`
                ) : (
                  "₹0 (No Repair)"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-brand-cyan" />
              <span>Repair Schedule & Claims</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="block text-xs text-slate-500">Est. Labor Time:</span>
                <span className="font-bold text-white">{repairTime || "N/A"}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Insurance Eligibility:</span>
                <span className="font-bold text-white">{insuranceEligibility}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
              <Hammer className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Plan</h4>
              <p className="text-sm leading-relaxed text-slate-200">
                {estimate.suggested_action}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
