"use client";

import { useState, useEffect } from "react";
import { Landmark, ShieldCheck, HelpCircle, Wrench, Clock, CheckCircle } from "lucide-react";

interface CostData {
  parts: number;
  labour: number;
  paint: number;
  gst: number;
  total: number;
}

interface TimelineData {
  working_hours: number;
  repair_days: number;
  completion_date: string;
}

interface InvoiceBreakdownProps {
  baseCosts: CostData;
  baseTimeline: TimelineData;
  onProfileChange: (costs: CostData, timeline: TimelineData, profile: string) => void;
}

export default function InvoiceBreakdown({ baseCosts, baseTimeline, onProfileChange }: InvoiceBreakdownProps) {
  const [profile, setProfile] = useState<"authorized" | "premium" | "independent">("authorized");

  // Re-run calculations when profile or baseCosts changes
  useEffect(() => {
    let partsMult = 1.0;
    let labourMult = 1.0;
    let paintMult = 1.0;
    let consumables = 0;
    let hoursMult = 1.0;
    let daysDiff = 0;

    if (profile === "authorized") {
      partsMult = 1.3;
      labourMult = 1.4;
      paintMult = 1.2;
      consumables = 800;
      hoursMult = 1.3;
      daysDiff = 1;
    } else if (profile === "premium") {
      partsMult = 1.1;
      labourMult = 1.2;
      paintMult = 1.4;
      consumables = 1200;
      hoursMult = 1.2;
      daysDiff = 0;
    } else { // independent
      partsMult = 0.9;
      labourMult = 0.7;
      paintMult = 0.8;
      consumables = 300;
      hoursMult = 0.8;
      daysDiff = -1;
    }

    const calculatedParts = Math.floor(baseCosts.parts * partsMult);
    const calculatedLabour = Math.floor(baseCosts.labour * labourMult);
    const calculatedPaint = Math.floor(baseCosts.paint * paintMult);
    const subtotal = calculatedParts + calculatedLabour + calculatedPaint + consumables;
    const calculatedGst = Math.floor(subtotal * 0.18);
    const calculatedTotal = subtotal + calculatedGst;

    const workingHours = Math.max(1, Math.round(baseTimeline.working_hours * hoursMult));
    const repairDays = Math.max(1, baseTimeline.repair_days + daysDiff);
    
    const today = new Date();
    today.setDate(today.getDate() + repairDays);
    const completionDate = today.toISOString().split("T")[0];

    onProfileChange(
      {
        parts: calculatedParts,
        labour: calculatedLabour,
        paint: calculatedPaint,
        gst: calculatedGst,
        total: calculatedTotal
      },
      {
        working_hours: workingHours,
        repair_days: repairDays,
        completion_date: completionDate
      },
      profile
    );
  }, [profile, baseCosts, baseTimeline.working_hours, baseTimeline.repair_days]);

  const getProfileTitle = (p: string) => {
    if (p === "authorized") return "OEM Authorized Service Center";
    if (p === "premium") return "Premium Detailing Workshop";
    return "Independent Local Garage";
  };

  const getProfileConsumables = (p: string) => {
    if (p === "authorized") return 800;
    if (p === "premium") return 1200;
    return 300;
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3 gap-2.5 print:border-slate-200">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-slate-800">
          <Wrench className="h-4 w-4 text-brand-cyan" />
          4. Repair Invoice & Rates Builder
        </h4>
        
        {/* Profile Selector */}
        <div className="flex gap-1 bg-slate-950 p-1 border border-white/10 rounded-xl print:hidden">
          {(["authorized", "premium", "independent"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProfile(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                profile === p 
                  ? "bg-brand-indigo text-white shadow" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p === "authorized" ? "OEM Center" : p === "premium" ? "Premium" : "Local Shop"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cost Invoice Table */}
        <div className="lg:col-span-8 space-y-2 font-mono text-xs">
          <span className="block text-[8px] text-slate-500 uppercase font-bold print:text-slate-600">
            Selected Profile: {getProfileTitle(profile)}
          </span>
          <div className="space-y-1.5 border border-white/5 p-4 rounded-xl bg-black/20 print:border-slate-300 print:bg-slate-50 print:text-black">
            <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
              <span className="text-slate-400 print:text-slate-500">Spare Parts Cost</span>
              <span className="font-semibold">{formatINR(baseCosts.parts)}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
              <span className="text-slate-400 print:text-slate-500">Labour Labor Charges</span>
              <span className="font-semibold">{formatINR(baseCosts.labour)}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
              <span className="text-slate-400 print:text-slate-500">Refinishing / Paint Cost</span>
              <span className="font-semibold">{formatINR(baseCosts.paint)}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
              <span className="text-slate-400 print:text-slate-500">Consumables & Detailing Materials</span>
              <span className="font-semibold">{formatINR(getProfileConsumables(profile))}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1 print:border-slate-200">
              <span className="text-slate-400 print:text-slate-500">GST Tax (18% Rate)</span>
              <span className="font-semibold">{formatINR(baseCosts.gst)}</span>
            </div>
            <div className="flex justify-between text-white print:text-brand-indigo font-bold text-sm pt-1.5">
              <span>Grand Total Estimate</span>
              <span>{formatINR(baseCosts.total)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Repair Timeline */}
        <div className="lg:col-span-4 rounded-xl border border-white/5 p-4 bg-black/20 flex flex-col justify-center space-y-3 print:border-slate-300 print:bg-slate-50 print:text-black">
          <span className="block text-[8px] text-slate-500 uppercase font-bold print:text-slate-600">Repair Timeline Details</span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-slate-500 text-[8px] uppercase">Working Hours</span>
              <span className="font-bold text-white print:text-black">{baseTimeline.working_hours} Hrs</span>
            </div>
            <div>
              <span className="block text-slate-500 text-[8px] uppercase">Estimated Days</span>
              <span className="font-bold text-white print:text-black">{baseTimeline.repair_days} Day(s)</span>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-2 print:border-slate-200">
              <span className="block text-slate-500 text-[8px] uppercase">Expected Completion Date</span>
              <span className="font-extrabold text-brand-cyan print:text-brand-indigo">{baseTimeline.completion_date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
