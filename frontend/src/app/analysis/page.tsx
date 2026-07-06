"use client";

import { useState } from "react";
import UploadCard from "@/components/UploadCard";
import ImagePreview from "@/components/ImagePreview";
import ResultCards, { PartDamage } from "@/components/ResultCards";
import ReportCard from "@/components/ReportCard";
import { AlertCircle, ServerCrash, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

interface AnalysisResponse {
  filename: string;
  damage_detected: boolean;
  overall_severity: string;
  confidence_score: number;
  parts_damaged: PartDamage[];
  repair_estimate: {
    min_cost: number;
    max_cost: number;
    currency: string;
    suggested_action: string;
  };
}

export default function AnalysisPage() {
  const [image, setImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleImageSelect = (file: File) => {
    setImage(file);
    setResult(null);
    setError(null);
    setFallbackMode(false);
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setFallbackMode(false);
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setFallbackMode(false);

    const formData = new FormData();
    formData.append("file", image);

    try {
      // 1. Attempt request to FastAPI backend
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();
      setResult(data);
    } catch (err) {
      console.warn("FastAPI backend unavailable, switching to frontend mock simulation.", err);
      
      // 2. Fallback to client-side simulation for seamless demonstration
      setFallbackMode(true);
      
      // Simulate backend latency (1.5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Return identical structure matching FastAPI main.py mock
      const mockResult: AnalysisResponse = {
        filename: image.name,
        damage_detected: true,
        overall_severity: "Moderate",
        confidence_score: 0.88,
        parts_damaged: [
          {
            part: "Front Bumper",
            severity: "Moderate",
            confidence: 0.91,
            description: "Visible indentation and deep paint scratches on the left bumper corner."
          },
          {
            part: "Left Headlight",
            severity: "High",
            confidence: 0.94,
            description: "Severe hairline cracks in the lens housing; potential water ingress risk."
          },
          {
            part: "Left Front Fender",
            severity: "Low",
            confidence: 0.79,
            description: "Minor paint transfer from surface scraping; panel alignment is intact."
          }
        ],
        repair_estimate: {
          min_cost: 1100,
          max_cost: 1650,
          currency: "USD",
          suggested_action: "Requires headlight lens assembly replacement and bumper localized dent pulling & refinishing."
        }
      };

      setResult(mockResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1">
      {/* Page Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Vehicle Scanner
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload an image of a vehicle to execute body panel assessment scans.
        </p>
      </div>

      {/* Connection Notice / Warning Alert */}
      {fallbackMode && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-amber/10 border border-brand-amber/20 p-4 animate-pulse-slow">
          <ServerCrash className="h-5 w-5 text-brand-amber shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-brand-amber">FastAPI Server Connection Skipped</p>
            <p className="text-slate-300 mt-1">
              Could not fetch from <code className="bg-black/30 px-1 py-0.5 rounded text-white">{API_BASE_URL}</code>. 
              The application automatically initiated frontend fallback simulation to provide a working demonstration.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-rose/10 border border-brand-rose/20 p-4">
          <AlertCircle className="h-5 w-5 text-brand-rose shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-brand-rose">Analysis Failed</p>
            <p className="text-slate-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Image View */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
            Source Image
          </h2>
          {!image ? (
            <UploadCard onImageSelect={handleImageSelect} />
          ) : (
            <ImagePreview
              file={image}
              onClear={handleClear}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

        {/* Right Column: AI Scan Output */}
        <div className="lg:col-span-7 space-y-8">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
            AI Scan Results
          </h2>

          {isAnalyzing && (
            <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 text-center text-slate-400 min-h-[300px]">
              <RefreshCw className="h-10 w-10 text-brand-cyan animate-spin mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Analyzing Damages...</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Sending image chunks to server. Generating damage severity grids and parsing cost estimations.
              </p>
            </div>
          )}

          {!isAnalyzing && !result && (
            <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 text-center text-slate-400 min-h-[300px]">
              <Sparkles className="h-10 w-10 text-brand-indigo/60 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Awaiting Image Analysis</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Upload a clear exterior photo of a vehicle and click &ldquo;Analyze Vehicle&rdquo; to review damage reports.
              </p>
            </div>
          )}

          {!isAnalyzing && result && (
            <div className="space-y-8 animate-fade-in">
              {/* Success Notification badge */}
              <div className="flex items-center gap-2 text-xs text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-3 py-1.5 rounded-full w-max">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Scan Completed in 1.5s
              </div>

              {/* Estimate Summary Report Card */}
              <ReportCard
                estimate={result.repair_estimate}
                overallSeverity={result.overall_severity}
                confidence={result.confidence_score}
              />

              {/* Damaged Parts breakdown List */}
              <ResultCards
                parts={result.parts_damaged}
                damageDetected={result.damage_detected}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
