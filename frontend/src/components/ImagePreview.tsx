"use client";

import { useEffect, useState } from "react";
import { Trash2, Cpu, Loader2 } from "lucide-react";

interface ImagePreviewProps {
  file: File;
  onClear: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function ImagePreview({
  file,
  onClear,
  onAnalyze,
  isAnalyzing,
}: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!previewUrl) return null;

  return (
    <div className="w-full space-y-6">
      {/* Image Preview Container */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vehicle preview"
            className="h-full w-full object-contain"
          />

          {/* Scanning Animation Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-brand-indigo/5">
              {/* Laser line */}
              <div className="animate-scan absolute left-0 h-[3px] w-full bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_8px_#06b6d4,0_0_15px_#06b6d4]" />
              {/* Pulsing Scan Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px]" />
            </div>
          )}

          {/* Remove Button */}
          {!isAnalyzing && (
            <button
              onClick={onClear}
              type="button"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 text-slate-400 border border-white/10 hover:bg-brand-rose hover:text-white backdrop-blur-sm transition-all duration-200"
              title="Remove image"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata & Actions */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-slate-400">File Details</h4>
            <p className="truncate text-base font-medium text-white">{file.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
          </div>

          <div className="flex shrink-0 gap-3">
            {!isAnalyzing && (
              <button
                onClick={onClear}
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Clear
              </button>
            )}
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              type="button"
              className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-cyan px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-indigo/20 hover:opacity-95 hover:shadow-brand-indigo/35 hover:scale-[1.01] transition-all disabled:pointer-events-none disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Analyzing Details...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4" />
                  Analyze Vehicle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
