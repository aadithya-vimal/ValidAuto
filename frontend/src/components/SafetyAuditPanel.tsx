"use client";

import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface SafetyData {
  roadworthy: string;
  night_driving_safe: string;
  highway_safe: string;
  long_distance_safe: string;
  reason: string;
}

interface SafetyAuditPanelProps {
  safety: SafetyData;
  severity: string;
}

export default function SafetyAuditPanel({ safety, severity }: SafetyAuditPanelProps) {
  const isSevere = severity.toLowerCase() === "severe";
  
  // Rain driving rule: if glass or bumper damage is severe/moderate, rain driving is highly unsafe due to optical reflection or water ingress.
  const rainDrivingSafe = isSevere ? "No" : "Yes";

  const getSafetyColor = (val: string) => {
    return val.toLowerCase() === "yes" 
      ? "text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20" 
      : "text-brand-rose bg-brand-rose/10 border-brand-rose/20";
  };

  const getSafetyIcon = (val: string) => {
    return val.toLowerCase() === "yes" 
      ? <ShieldCheck className="h-4.5 w-4.5 text-brand-emerald shrink-0" />
      : <ShieldAlert className="h-4.5 w-4.5 text-brand-rose shrink-0" />;
  };

  const checklist = [
    { label: "Roadworthy Condition", value: safety.roadworthy, desc: safety.roadworthy === "Yes" ? "Body panel structural mounts are verified secure." : "Structural mounting compromised or missing core pins." },
    { label: "Night Driving Suitability", value: safety.night_driving_safe, desc: safety.night_driving_safe === "Yes" ? "Headlight and indicator refraction vectors normal." : "High glare refraction risks from fractured glass modules." },
    { label: "Highway Speed Suitability", value: safety.highway_safe, desc: safety.highway_safe === "Yes" ? "Panels remain aerodynamic under wind pressure." : "Air drag could detach unsecured bumper clips or panel shields." },
    { label: "Rain Driving Suitability", value: rainDrivingSafe, desc: rainDrivingSafe === "Yes" ? "No water ingress risks identified on panel seals." : "Moisture ingress risk in cracked optical casings or bare metal." },
    { label: "Long Distance Endurance", value: safety.long_distance_safe, desc: safety.long_distance_safe === "Yes" ? "No immediate mechanical or thermal risk flags." : "Restricted to local driving only to prevent secondary fractures." }
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-slate-800">
        <ShieldAlert className="h-4 w-4 text-brand-cyan" />
        8. Driving Safety & Roadworthiness Analysis
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safety grid */}
        <div className="space-y-3">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between p-3 rounded-xl border border-white/5 bg-black/20 print:bg-slate-50 print:border-slate-300 print:text-black gap-2.5">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-200 print:text-black">{item.label}</span>
                <span className="block text-[10px] text-slate-500 leading-normal">{item.desc}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase flex items-center gap-1 border shrink-0 ${getSafetyColor(item.value)}`}>
                {getSafetyIcon(item.value)}
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Assessor Safety Summary block */}
        <div className="rounded-xl border border-white/5 p-4 bg-slate-900/40 flex flex-col justify-between print:border-slate-300 print:bg-slate-50 print:text-black">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider print:text-slate-600 block">Assessor Comments</span>
            <p className="text-xs text-slate-300 leading-relaxed print:text-slate-800">
              {safety.reason}
            </p>
          </div>

          <div className={`mt-4 p-3.5 rounded-xl border flex items-start gap-2 text-xs font-bold ${
            isSevere 
              ? "bg-brand-rose/10 border-brand-rose/20 text-brand-rose" 
              : "bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald"
          }`}>
            {isSevere ? <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
            <div>
              <span className="block uppercase text-[10px]">Immediate Repair Action</span>
              <p className="font-normal text-slate-300 print:text-slate-800 mt-1">
                {isSevere 
                  ? "Highly Recommended: Structural and sensor damage requires immediate workshop scheduling." 
                  : "Not Required: Minor cosmetic defects can be scheduled alongside regular service intervals."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
