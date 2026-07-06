"use client";

import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, AlertCircle } from "lucide-react";

interface UploadCardProps {
  onImageSelect: (file: File) => void;
}

export default function UploadCard({ onImageSelect }: UploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File | null) => {
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, JPEG, or WEBP).");
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setError(null);
    onImageSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragActive
            ? "border-brand-cyan bg-brand-cyan/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            : "border-white/10 bg-slate-900/40 hover:border-brand-indigo/50 hover:bg-slate-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileInput}
        />

        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-indigo/10 group-hover:text-brand-cyan">
          <UploadCloud className="h-8 w-8" />
          <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-tr from-brand-indigo to-brand-cyan opacity-0 blur-md group-hover:opacity-40 transition-opacity" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">
          Upload vehicle image
        </h3>
        <p className="mb-1 text-sm text-slate-400">
          Drag and drop your image here, or{" "}
          <span className="text-brand-cyan font-medium group-hover:underline">
            browse computer
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Supports PNG, JPG, JPEG, or WEBP up to 10MB
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-rose/10 px-4 py-2 text-sm text-brand-rose border border-brand-rose/20 animate-pulse-slow">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
