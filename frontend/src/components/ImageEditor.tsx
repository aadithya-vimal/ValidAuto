"use client";

import { useState, useRef, useEffect } from "react";
import { RotateCw, RefreshCw, ZoomIn, Sun, Sliders, Check, X } from "lucide-react";

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedSrc: string) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageSrc, onSave, onCancel }: ImageEditorProps) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState(1); // 1.0 to 3.0
  const [offsetX, setOffsetX] = useState(0); // in pixels
  const [offsetY, setOffsetY] = useState(0); // in pixels
  const [brightness, setBrightness] = useState(100); // 50 to 150
  const [contrast, setContrast] = useState(100); // 50 to 150

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Redraw canvas whenever parameters change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      // Setup canvas size
      const maxDim = 400;
      let w = img.width;
      let h = img.height;

      // Handle aspect ratios under rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const drawWidth = isRotated90or270 ? h : w;
      const drawHeight = isRotated90or270 ? w : h;

      let scale = 1;
      if (drawWidth > drawHeight) {
        if (drawWidth > maxDim) {
          scale = maxDim / drawWidth;
        }
      } else {
        if (drawHeight > maxDim) {
          scale = maxDim / drawHeight;
        }
      }

      canvas.width = drawWidth * scale;
      canvas.height = drawHeight * scale;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply CSS Filters directly to Canvas context (Supported by modern browsers)
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      // Apply transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw
      const drawX = -(w * scale) / 2 + offsetX;
      const drawY = -(h * scale) / 2 + offsetY;
      ctx.drawImage(img, drawX, drawY, w * scale, h * scale);
    };
    img.src = imageSrc;
  }, [rotation, zoom, offsetX, offsetY, brightness, contrast, imageSrc]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setBrightness(100);
    setContrast(100);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL("image/jpeg", 0.85));
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border-white/10 bg-slate-950/80 max-w-xl mx-auto space-y-6">
      <div className="border-b border-white/5 pb-3 flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="h-4 w-4 text-brand-cyan" />
          Image Pre-processing Editor
        </h4>
        <button onClick={onCancel} className="text-slate-400 hover:text-white p-1">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Preview area */}
      <div className="bg-slate-900 rounded-xl p-4 border border-white/5 flex items-center justify-center min-h-[260px]">
        <canvas ref={canvasRef} className="rounded border border-white/10 max-w-full max-h-[300px] shadow" />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase tracking-wide flex justify-between">
            <span>Zoom factor</span>
            <span className="text-brand-cyan">{zoom.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase tracking-wide flex justify-between">
            <span>Brightness</span>
            <span className="text-brand-cyan">{brightness}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase tracking-wide flex justify-between">
            <span>Contrast</span>
            <span className="text-brand-cyan">{contrast}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>

        {/* Translation controls */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase tracking-wide">Pan (X/Y Offsets)</label>
          <div className="flex gap-2">
            <input
              type="range"
              min="-100"
              max="100"
              value={offsetX}
              onChange={(e) => setOffsetX(parseInt(e.target.value))}
              placeholder="X offset"
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
            />
            <input
              type="range"
              min="-100"
              max="100"
              value={offsetY}
              onChange={(e) => setOffsetY(parseInt(e.target.value))}
              placeholder="Y offset"
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-3 border-t border-white/5 gap-2 text-xs font-bold">
        <div className="flex gap-2">
          <button
            onClick={handleRotate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
            Rotate 90°
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <button
          onClick={handleApply}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2.5 text-white shadow shadow-brand-indigo/20 cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Apply Preprocessing
        </button>
      </div>
    </div>
  );
}
