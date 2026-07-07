"use client";

import { CheckCircle2, Landmark, ShieldCheck, Printer, FileText } from "lucide-react";

interface CertificateViewProps {
  vehicleInfo: {
    owner_name: string;
    make: string;
    model_name: string;
    variant: string;
    year: number;
    reg_number: string;
    vin: string;
    odometer: number;
    insurance_provider: string;
    policy_number: string;
  };
  damageType: string;
  confidence: number;
  severity: string;
  healthScore: number;
  totalCost: number;
  completionDate: string;
  timestamp: string;
  images: {
    original: string;
    enhanced: string;
    heatmap: string;
    localized: string;
  };
}

export default function CertificateView({
  vehicleInfo,
  damageType,
  confidence,
  severity,
  healthScore,
  totalCost,
  completionDate,
  timestamp,
  images
}: CertificateViewProps) {
  const isDamage = damageType.toLowerCase() !== "none";

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="hidden print:block w-full bg-white text-black p-8 font-sans border-8 border-double border-slate-300 rounded-lg max-w-4xl mx-auto space-y-8">
      {/* Certificate Header */}
      <div className="text-center space-y-2 border-b-2 border-slate-300 pb-6">
        <h1 className="text-3xl font-serif font-black tracking-wider text-slate-900">VALIDAUTO</h1>
        <h2 className="text-lg font-bold uppercase tracking-widest text-slate-600">Vehicle Inspection Certificate</h2>
        <span className="text-xs font-mono text-slate-500 block">Inspection Certificate ID: VA-CERT-{vehicleInfo.reg_number.replace(/-/g, "")}</span>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-2 gap-8 items-start border-b border-slate-200 pb-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase text-slate-800 tracking-wider">1. Registered Vehicle Information</h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Owner Name</span>
              <span className="font-bold text-slate-800">{vehicleInfo.owner_name}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Make & Model</span>
              <span className="font-bold text-slate-800">{vehicleInfo.make} {vehicleInfo.model_name}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Mfg. Year</span>
              <span className="font-bold text-slate-800">{vehicleInfo.year}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Registration No</span>
              <span className="font-bold text-slate-800">{vehicleInfo.reg_number}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Chassis / VIN</span>
              <span className="font-bold text-slate-800">{vehicleInfo.vin}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Odometer</span>
              <span className="font-bold text-slate-800">{vehicleInfo.odometer.toLocaleString()} km</span>
            </div>
          </div>
        </div>

        {/* QR Code and Meta info */}
        <div className="flex flex-col items-end space-y-4 text-right">
          {/* Simulated QR Code box */}
          <div className="h-24 w-24 border border-slate-300 p-1 bg-white">
            {/* Simple grid representing QR Code */}
            <div className="grid grid-cols-6 gap-0.5 h-full w-full">
              {[...Array(36)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-full w-full ${
                    (i % 5 === 0 || i % 7 === 0 || i < 6 || i > 30 || (i % 6 === 0 && i < 24)) 
                      ? "bg-slate-900" 
                      : "bg-white"
                  }`} 
                />
              ))}
            </div>
          </div>
          <div className="text-xs">
            <span className="block text-[9px] text-slate-500 uppercase">Inspection Timestamp</span>
            <span className="font-bold text-slate-800">{new Date(timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Audit Images */}
      <div className="space-y-4 border-b border-slate-200 pb-6">
        <h3 className="font-bold text-sm uppercase text-slate-800 tracking-wider">2. Visual Evidence & Spatial Localization</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-slate-200 p-1 bg-slate-50 text-center">
            <span className="block text-[8px] text-slate-500 uppercase mb-1">Original Photo</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.original} alt="Original" className="w-full aspect-square object-cover" />
          </div>
          <div className="border border-slate-200 p-1 bg-slate-50 text-center">
            <span className="block text-[8px] text-slate-500 uppercase mb-1">Damage Localization</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.localized} alt="Localized" className="w-full aspect-square object-cover" />
          </div>
          <div className="border border-slate-200 p-1 bg-slate-50 text-center">
            <span className="block text-[8px] text-slate-500 uppercase mb-1">Grad-CAM Heatmap</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.heatmap} alt="Grad-CAM" className="w-full aspect-square object-cover" />
          </div>
        </div>
      </div>

      {/* Diagnosis Verdict */}
      <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6 text-xs">
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase text-slate-800 tracking-wider">3. Neural Diagnostic Verdict</h3>
          <div className="grid grid-cols-2 gap-4 font-mono">
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Damage Class</span>
              <span className="font-bold text-slate-800 capitalize">{isDamage ? damageType : "No Damage Detected"}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Severity Tier</span>
              <span className="font-bold text-slate-800">{severity}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">AI Confidence</span>
              <span className="font-bold text-slate-800">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Vehicle Health Index</span>
              <span className="font-bold text-slate-800">{healthScore}/100</span>
            </div>
          </div>
        </div>

        {/* Repair Quote */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase text-slate-800 tracking-wider">4. Price Quote & Completion</h3>
          <div className="grid grid-cols-2 gap-4 font-mono">
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Estimated Total Cost</span>
              <span className="font-bold text-slate-800">{formatINR(totalCost)}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase">Completion Estimate</span>
              <span className="font-bold text-slate-800">{completionDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Area */}
      <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
        <div className="flex flex-col items-center justify-end h-20">
          <div className="h-0.5 w-40 bg-slate-400 mb-1" />
          <span className="text-[9px] text-slate-500 font-semibold uppercase">Surving Officer Signature</span>
        </div>
        <div className="flex flex-col items-center justify-end h-20">
          <div className="text-xs font-serif font-black tracking-wide text-slate-800 italic mb-2">ValidAuto Verified</div>
          <div className="h-0.5 w-40 bg-slate-400 mb-1" />
          <span className="text-[9px] text-slate-500 font-semibold uppercase">ValidAuto Audit Stamp</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-slate-500 border-t border-slate-200 pt-4">
        <p>This certificate represents a neural computer vision assessment and does not constitute a legal valuation.</p>
        <p className="mt-0.5">ValidAuto Systems Inc. • Assessor Engine v5.0.0</p>
      </div>
    </div>
  );
}
