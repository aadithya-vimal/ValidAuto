"use client";

import { Wrench } from "lucide-react";

interface CostData {
  parts: number;
  labour: number;
  paint: number;
  gst: number;
  total: number;
  items?: Array<{
    part: string;
    damage: string;
    severity: string;
    parts: number;
    labour: number;
    paint: number;
    subtotal: number;
  }>;
}

interface TimelineData {
  working_hours: number;
  repair_days: number;
  completion_date: string;
}

interface InvoiceBreakdownProps {
  costs: CostData;
  timeline: TimelineData;
}

export default function InvoiceBreakdown({ costs, timeline }: InvoiceBreakdownProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 print:border-slate-200">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-slate-800">
          <Wrench className="h-4 w-4 text-brand-cyan" />
          4. Repair Invoice & Rates Builder
        </h4>
      </div>

      <div className="space-y-5">
        {/* Cost Invoice Table */}
        <div className="space-y-1.5 border border-white/5 p-4 rounded-xl bg-black/20 print:border-slate-300 print:bg-slate-50 print:text-black">
          <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
            <span className="text-slate-400 print:text-slate-500">Spare Parts Cost</span>
            <span className="font-semibold">{formatINR(costs.parts)}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
            <span className="text-slate-400 print:text-slate-500">Labour / Labor Charges</span>
            <span className="font-semibold">{formatINR(costs.labour)}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
            <span className="text-slate-400 print:text-slate-500">Refinishing / Paint Cost</span>
            <span className="font-semibold">{formatINR(costs.paint)}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
            <span className="text-slate-400 print:text-slate-500">GST Tax (18% Rate)</span>
            <span className="font-semibold">{formatINR(costs.gst)}</span>
          </div>
          <div className="flex justify-between text-white print:text-brand-indigo font-bold text-sm pt-1.5">
            <span>Grand Total Estimate</span>
            <span>{formatINR(costs.total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[8px] text-slate-500 uppercase font-bold print:text-slate-600">Itemized Damage & Parts</span>
          {(costs.items || []).length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700">
              No damaged part breakdown available for this inspection.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20 print:border-slate-300 print:bg-slate-50">
              <div className="grid grid-cols-12 gap-2 border-b border-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 print:border-slate-200 print:text-slate-600">
                <span className="col-span-3">Part</span>
                <span className="col-span-5">Damage</span>
                <span className="col-span-1 text-right">P</span>
                <span className="col-span-1 text-right">L</span>
                <span className="col-span-1 text-right">Paint</span>
                <span className="col-span-1 text-right">Sub</span>
              </div>
              <div className="divide-y divide-white/5 print:divide-slate-200">
                {costs.items!.map((item) => (
                  <div key={item.part} className="grid grid-cols-12 gap-2 px-3 py-3 text-[10px] font-mono">
                    <div className="col-span-3">
                      <div className="font-bold uppercase text-slate-200 print:text-black">{item.part}</div>
                      <div className="mt-0.5 text-[9px] text-slate-500 print:text-slate-600">{item.severity}</div>
                    </div>
                    <div className="col-span-5 text-slate-300 print:text-slate-700 leading-snug">{item.damage}</div>
                    <div className="col-span-1 text-right font-semibold">{formatINR(item.parts)}</div>
                    <div className="col-span-1 text-right font-semibold">{formatINR(item.labour)}</div>
                    <div className="col-span-1 text-right font-semibold">{formatINR(item.paint)}</div>
                    <div className="col-span-1 text-right font-semibold">{formatINR(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Repair Timeline */}
        <div className="rounded-xl border border-white/5 p-4 bg-black/20 space-y-3 print:border-slate-300 print:bg-slate-50 print:text-black">
          <span className="block text-[8px] text-slate-500 uppercase font-bold print:text-slate-600">Repair Timeline Details</span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-slate-500 text-[8px] uppercase">Working Hours</span>
              <span className="font-bold text-white print:text-black">{timeline.working_hours} Hrs</span>
            </div>
            <div>
              <span className="block text-slate-500 text-[8px] uppercase">Estimated Days</span>
              <span className="font-bold text-white print:text-black">{timeline.repair_days} Day(s)</span>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-2 print:border-slate-200">
              <span className="block text-slate-500 text-[8px] uppercase">Expected Completion Date</span>
              <span className="font-extrabold text-brand-cyan print:text-brand-indigo">{timeline.completion_date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
