"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, PieChart, TrendingUp, Calendar, AlertCircle, 
  Activity, ShieldCheck, IndianRupee, Clock, Cpu 
} from "lucide-react";

interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string; // Registration Number
  ownerName: string;
  make?: string;
  modelName?: string;
  damage: string;
  confidence: number;
  severity: string;
  healthScore: number;
  minCost: number;
  maxCost: number;
}

export default function AnalyticsPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("validauto_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history logs:", e);
      }
    }
  }, []);

  // Compute stats
  const total = history.length;
  const damaged = history.filter(item => item.damage.toLowerCase() !== "none").length;
  const healthy = total - damaged;
  
  const avgHealth = total > 0 
    ? Math.round(history.reduce((acc, item) => acc + item.healthScore, 0) / total)
    : 100;
    
  const avgCost = total > 0
    ? Math.round(history.reduce((acc, item) => acc + item.minCost, 0) / total)
    : 0;

  // Compute most common damage
  const damageCounts: Record<string, number> = {};
  history.forEach(item => {
    const d = item.damage.toLowerCase();
    if (d !== "none") {
      damageCounts[d] = (damageCounts[d] || 0) + 1;
    }
  });
  let mostCommonDamage = "None";
  let maxDCount = 0;
  Object.entries(damageCounts).forEach(([dmg, count]) => {
    if (count > maxDCount) {
      maxDCount = count;
      mostCommonDamage = dmg;
    }
  });

  // Compute most common brand
  const brandCounts: Record<string, number> = {};
  history.forEach(item => {
    const b = item.make || "Unknown";
    if (b !== "Unknown") {
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    }
  });
  let mostCommonBrand = "None";
  let maxBCount = 0;
  Object.entries(brandCounts).forEach(([brand, count]) => {
    if (count > maxBCount) {
      maxBCount = count;
      mostCommonBrand = brand;
    }
  });

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-brand-cyan" />
          Analytics Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Aggregated diagnostic statistics compiled dynamically from local browser logs.
        </p>
      </div>

      {total === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-16 text-center text-slate-400 min-h-[350px]">
          <TrendingUp className="h-12 w-12 text-brand-indigo/50 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">No Inspection Analytics Available</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Execute inspection scans on vehicles first. The dashboard will compile charts and metrics as history logs grow.
          </p>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-5 py-3 text-sm font-bold text-white shadow hover:opacity-95"
          >
            Launch Scanner
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Total Audits</span>
              <span className="text-2xl font-black text-white">{total}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Damaged Vehicles</span>
              <span className="text-2xl font-black text-brand-rose">{damaged}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Average Health Score</span>
              <span className="text-2xl font-black text-brand-cyan">{avgHealth}/100</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Average Repair Cost</span>
              <span className="text-2xl font-black text-brand-emerald">{formatINR(avgCost)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Bar Chart: Damage Distributions */}
            <div className="glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="h-4 w-4 text-brand-cyan" />
                Defect Category Distributions
              </h3>
              
              <div className="space-y-4">
                {Object.keys(damageCounts).length === 0 ? (
                  <span className="text-xs text-slate-500 italic block">No defects present in logs.</span>
                ) : (
                  Object.entries(damageCounts).map(([dmg, count]) => {
                    const pct = Math.round((count / damaged) * 100);
                    return (
                      <div key={dmg} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="capitalize text-slate-300">{dmg}</span>
                          <span className="text-brand-cyan">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-brand-indigo to-brand-cyan"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Health Score Ranges Distribution */}
            <div className="glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-brand-cyan" />
                Vehicle Health Index distribution
              </h3>

              <div className="h-[180px] flex items-end justify-between gap-3 pt-6 border-b border-white/5 px-2">
                {[
                  { range: "0-40", count: history.filter(i => i.healthScore <= 40).length, label: "Critical" },
                  { range: "41-70", count: history.filter(i => i.healthScore > 40 && i.healthScore <= 70).length, label: "Warning" },
                  { range: "71-90", count: history.filter(i => i.healthScore > 70 && i.healthScore <= 90).length, label: "Fair" },
                  { range: "91-100", count: history.filter(i => i.healthScore > 90).length, label: "Excellent" }
                ].map((bin, idx) => {
                  const maxCount = max(1, history.length);
                  const hPct = (bin.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] text-brand-cyan font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {bin.count}
                      </div>
                      <div 
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-indigo to-brand-cyan min-h-[4px] transition-all duration-500 ease-out"
                        style={{ height: `${max(4, hPct * 1.5)}px` }}
                      />
                      <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{bin.label}</span>
                      <span className="block text-[9px] text-slate-600 font-mono mt-0.5">{bin.range}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40">
              <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Most Common Damage</span>
              <span className="text-xl font-extrabold text-white capitalize">{mostCommonDamage}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40">
              <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Most Inspected Brand</span>
              <span className="text-xl font-extrabold text-white capitalize">{mostCommonBrand}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const max = (a: number, b: number) => (a > b ? a : b);
