"use client";

import { FileText, Printer, ShieldAlert, DollarSign, Hammer } from "lucide-react";

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
}

export default function ReportCard({
  estimate,
  overallSeverity,
  confidence,
}: ReportCardProps) {
  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-brand-indigo/20 shadow-xl shadow-slate-950/50">
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
              <p className="text-xs text-slate-400">AutoShield AI Damage Report</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Print PDF
          </button>
        </div>

        {/* Highlight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estimate */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase">Estimated Cost</span>
              <span className="block text-lg font-bold text-white">
                {formatCurrency(estimate.min_cost, estimate.currency)} -{" "}
                {formatCurrency(estimate.max_cost, estimate.currency)}
              </span>
            </div>
          </div>

          {/* Severity */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-rose/10 text-brand-rose">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase">Overall Severity</span>
              <span className="block text-lg font-bold text-white capitalize">
                {overallSeverity}
              </span>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase">Avg. Confidence</span>
              <span className="block text-lg font-bold text-white">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet mt-0.5">
            <Hammer className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Suggested Action Plan</h4>
            <p className="text-sm leading-relaxed text-slate-300">
              {estimate.suggested_action}
            </p>
          </div>
        </div>

        {/* Notice Disclaimer */}
        <p className="text-[11px] text-slate-500 text-center leading-normal">
          Disclaimer: This is an AI-generated damage estimate for phase 1 validation purposes.
          Actual repairs must be inspected physically by a certified mechanic to verify interior/structural safety before claiming insurance.
        </p>
      </div>
    </div>
  );
}
