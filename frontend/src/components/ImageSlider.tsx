"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, ShieldAlert, Sparkles, Image as ImageIcon } from "lucide-react";

interface ImageSliderProps {
  original: string;
  enhanced: string;
  heatmap: string;
  localized: string; // contains segment mask & bounding boxes & centroids
}

export default function ImageSlider({ original, enhanced, heatmap, localized }: ImageSliderProps) {
  const [leftImage, setLeftImage] = useState<"original" | "enhanced" | "localized" | "heatmap">("original");
  const [rightImage, setRightImage] = useState<"original" | "enhanced" | "localized" | "heatmap">("localized");
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getSrc = (type: "original" | "enhanced" | "localized" | "heatmap") => {
    if (type === "original") return original;
    if (type === "enhanced") return enhanced;
    if (type === "localized") return localized;
    return heatmap;
  };

  const handleMove = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // Left click dragging
      handleMove(e.clientX);
    }
  };

  const modes = [
    { id: "original", label: "Original" },
    { id: "enhanced", label: "Enhanced" },
    { id: "localized", label: "Localized" },
    { id: "heatmap", label: "Grad-CAM" }
  ] as const;

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3 gap-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-brand-cyan" />
          Interactive Visual Comparison Slider
        </h4>

        {/* View Selectors */}
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Left View:</span>
            <select
              value={leftImage}
              onChange={(e) => setLeftImage(e.target.value as any)}
              className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none"
            >
              {modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Right View:</span>
            <select
              value={rightImage}
              onChange={(e) => setRightImage(e.target.value as any)}
              className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none"
            >
              {modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Slider viewport */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 cursor-ew-resize select-none max-h-[360px]"
      >
        {/* Right base image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getSrc(rightImage)}
          alt="Right View"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Left clipped image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getSrc(leftImage)}
          alt="Left View"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ clipPath: `inset(0px ${100 - sliderPos}% 0px 0px)` }}
        />

        {/* Divider bar */}
        <div 
          className="absolute inset-y-0 w-1 bg-brand-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)] cursor-ew-resize"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-slate-950 border-2 border-brand-cyan shadow flex items-center justify-center font-bold text-brand-cyan text-[10px]">
            ↔
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono text-center leading-normal">
        * Left-click and drag cursor over the image pane to slide compare between views.
      </div>
    </div>
  );
}
