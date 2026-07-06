"use client";

import { Cpu } from "lucide-react";

interface SystemHealthPanelProps {
  primaryModel: string;
  secondaryModel: string;
  tfVersion: string;
  inferenceTime: number;
  inputRes: string;
  primaryDataset: string;
  secondaryDataset: string;
  qualityRating: string;
  softwareVersion: string;
}

export default function SystemHealthPanel({
  primaryModel,
  secondaryModel,
  tfVersion,
  inferenceTime,
  inputRes,
  primaryDataset,
  secondaryDataset,
  qualityRating,
  softwareVersion
}: SystemHealthPanelProps) {
  const specs = [
    { label: "Primary Classifier Model", val: primaryModel },
    { label: "Secondary Categorizer Model", val: secondaryModel },
    { label: "TensorFlow Environment", val: tfVersion },
    { label: "Pipeline Inference Speed", val: `${inferenceTime.toFixed(4)}s` },
    { label: "Input Tensor Shape", val: inputRes },
    { label: "Primary Dataset", val: primaryDataset },
    { label: "Secondary Dataset", val: secondaryDataset },
    { label: "Hardware Node Type", val: "CPU Execution Node" },
    { label: "Image Quality Rating", val: qualityRating },
    { label: "ValidAuto Engine Version", val: softwareVersion }
  ];

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 print:border-slate-300 print:bg-slate-50">
      <div className="w-full flex items-center justify-between p-4 font-bold text-white text-xs uppercase tracking-wider border-b border-white/5 print:border-slate-300 print:text-black">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-brand-cyan" />
          <span>10. Neural Model Technical Details</span>
        </div>
        <span className="font-mono text-[9px] text-slate-500">v{softwareVersion}</span>
      </div>
      
      <div className="p-4 font-mono text-[10px] text-slate-300 print:text-black">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
          {specs.map((spec, idx) => (
            <div key={idx}>
              <span className="block text-slate-500 uppercase text-[8px]">{spec.label}</span>
              <span className="font-bold">{spec.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
