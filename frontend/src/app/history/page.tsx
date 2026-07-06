"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  History, Calendar, Trash2, ArrowLeft, Cpu, Activity, 
  ShieldAlert, IndianRupee, Sparkles 
} from "lucide-react";

interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  imageSrc: string; // Base64 thumbnail or standard image URL
  damage: string;
  confidence: number;
  severity: string;
  healthScore: number;
  minCost: number;
  maxCost: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Load history from local storage
    const storedHistory = localStorage.getItem("validauto_history");
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (err) {
        console.error("Failed to parse history logs:", err);
      }
    }
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all inspection records? This action cannot be undone.")) {
      localStorage.removeItem("validauto_history");
      setHistory([]);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <History className="h-8 w-8 text-brand-cyan" />
            Inspection Audit History
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Access and manage past machine learning diagnostic reports generated locally in this browser.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2.5 text-xs font-bold text-white shadow shadow-brand-indigo/15 hover:opacity-95 transition-all"
          >
            <Cpu className="h-4 w-4" />
            New Inspection
          </Link>
          
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-rose/20 bg-brand-rose/5 px-4 py-2.5 text-xs font-bold text-brand-rose hover:bg-brand-rose/10 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-16 text-center text-slate-400 min-h-[350px]">
          <Sparkles className="h-12 w-12 text-brand-indigo/50 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">No Inspection Records Found</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            You haven&rsquo;t scanned any vehicles yet. Run your first neural network scan to populate local history logs.
          </p>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Scanner
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => {
            const isWhole = item.damage.includes("whole") || item.damage.includes("clean") || item.damage.includes("none");
            
            return (
              <div 
                key={item.id} 
                className="glass-panel glass-panel-hover overflow-hidden rounded-2xl border-white/5 bg-slate-900/40 flex flex-col justify-between"
              >
                {/* Image & Overlay Header */}
                <div className="relative aspect-video bg-slate-950/80 overflow-hidden border-b border-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageSrc}
                    alt={item.filename}
                    className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Date badge */}
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] bg-slate-950/80 border border-white/10 px-2.5 py-1 rounded-md text-slate-300">
                    <Calendar className="h-3 w-3 text-brand-cyan" />
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>

                  {/* Health Score Badge overlay */}
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] bg-slate-950/80 border border-white/10 px-2.5 py-1 rounded-md text-white font-bold">
                    Health Score: {item.healthScore}/100
                  </div>
                </div>

                {/* Audit Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 uppercase font-semibold truncate max-w-[140px]">{item.filename}</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.severity === "High" ? "bg-brand-rose/10 text-brand-rose border border-brand-rose/20" :
                        item.severity === "Moderate" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20"
                      }`}>
                        {item.severity}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white capitalize">
                      {isWhole ? "No Damage Detected" : item.damage}
                    </h4>
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                    {/* Cost */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald shrink-0">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase">Est. Repair</span>
                        <span className="block text-xs font-bold text-white">
                          {item.minCost > 0 ? (
                            `${formatCurrency(item.minCost)} - ${formatCurrency(item.maxCost)}`
                          ) : (
                            "₹0 (No Repair)"
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan shrink-0">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase">AI Conf.</span>
                        <span className="block text-xs font-bold text-white">{(item.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
