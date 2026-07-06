"use client";

import { useState } from "react";
import { Eye, ShieldAlert, Sparkles, Image as ImageIcon, ZoomIn } from "lucide-react";

interface ImageComparerProps {
  original: string;
  enhanced: string;
  heatmap: string;
  localized: string;
}

export default function ImageComparer({ original, enhanced, heatmap, localized }: ImageComparerProps) {
  const [activeTab, setActiveTab] = useState<"original" | "enhanced" | "localized" | "heatmap">("original");

  const tabs = [
    { id: "original", label: "Original Photo", icon: ImageIcon, desc: "Raw camera frame prior to processing." },
    { id: "enhanced", label: "Enhanced Image", icon: Sparkles, desc: "Bilateral filtering & contrast equalized." },
    { id: "localized", label: "Damage Localization", icon: ShieldAlert, desc: "Contour bounding boxes drawn on panel." },
    { id: "heatmap", label: "Grad-CAM Heatmap", icon: Eye, desc: "Neural activation map showing target focus." }
  ] as const;

  const activeImage = 
    activeTab === "original" ? original :
    activeTab === "enhanced" ? enhanced :
    activeTab === "localized" ? localized :
    heatmap;

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:hidden">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <ImageIcon className="h-4 w-4 text-brand-cyan" />
        Interactive Image Diagnostics
      </h4>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Thumbnails Selector */}
        <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 shrink-0 lg:shrink cursor-pointer ${
                  isActive 
                    ? "bg-brand-indigo/10 border-brand-indigo/40 text-white" 
                    : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <Icon className={`h-4 w-4 ${isActive ? "text-brand-cyan" : ""}`} />
                  {tab.label}
                </div>
                <span className="text-[10px] text-slate-500 hidden sm:block leading-normal">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Large Viewer Screen */}
        <div className="lg:col-span-8 relative aspect-video bg-slate-950/80 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={activeTab}
            className="w-full h-full object-contain max-h-[350px] transition-all duration-300"
          />
          <div className="absolute bottom-3 left-3 bg-slate-950/85 border border-white/10 px-2.5 py-1 rounded-md text-[10px] text-slate-300 font-mono flex items-center gap-1.5">
            <ZoomIn className="h-3 w-3 text-brand-cyan" />
            <span>Mode: {activeTab.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
