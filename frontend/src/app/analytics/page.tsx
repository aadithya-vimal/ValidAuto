"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, AlertCircle, 
  Activity, ShieldCheck, IndianRupee, Clock, Cpu 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie 
} from "recharts";

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

  const total = history.length;
  const damaged = history.filter(item => item.damage.toLowerCase() !== "none").length;
  const healthy = total - damaged;
  
  const avgHealth = total > 0 
    ? Math.round(history.reduce((acc, item) => acc + item.healthScore, 0) / total)
    : 100;
    
  const avgCost = total > 0
    ? Math.round(history.reduce((acc, item) => acc + item.minCost, 0) / total)
    : 0;

  const avgConfidence = total > 0
    ? Math.round((history.reduce((acc, item) => acc + item.confidence, 0) / total) * 100)
    : 0;

  // 1. Defect Category distribution data for Pie Chart
  const damageCounts: Record<string, number> = {};
  history.forEach(item => {
    const d = item.damage.toLowerCase();
    if (d !== "none") {
      damageCounts[dmgLabel(d)] = (damageCounts[dmgLabel(d)] || 0) + 1;
    }
  });
  const damageChartData = Object.entries(damageCounts).map(([name, value]) => ({ name, value }));

  // Colors for defect types
  const COLORS = ["#818cf8", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];

  // 2. Odometer vs Cost Scatter/Area Trend
  const costTrendData = history.map((item) => ({
    name: new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    cost: item.minCost,
    health: item.healthScore
  })).reverse();

  // 3. Brand distribution
  const brandCounts: Record<string, number> = {};
  history.forEach(item => {
    const b = item.make || "Maruti Suzuki";
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  });
  const brandChartData = Object.entries(brandCounts).map(([name, value]) => ({ name, value }));

  // Helper
  function dmgLabel(val: string) {
    if (val === "scratch") return "Scratch";
    if (val === "dent") return "Dent";
    if (val === "bumper") return "Bumper";
    if (val === "glass") return "Glass";
    return "Other";
  }

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
          Enterprise Analytics Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Auditing key performance distributions, damage counts, and invoice metrics.
        </p>
      </div>

      {total === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-16 text-center text-slate-400 min-h-[350px]">
          <TrendingUp className="h-12 w-12 text-brand-indigo/50 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">No Historical Data</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Execute inspection scans on vehicles first to populate these dashboard charts.
          </p>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-5 py-3 text-sm font-bold text-white shadow hover:opacity-95"
          >
            Launch Inspection Wizard
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Total Scans</span>
              <span className="text-2xl font-black text-white">{total}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Damaged Panels</span>
              <span className="text-2xl font-black text-brand-rose">{damaged}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Clean / Healthy</span>
              <span className="text-2xl font-black text-brand-emerald">{healthy}</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Avg Health Index</span>
              <span className="text-2xl font-black text-brand-cyan">{avgHealth}%</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-slate-900/40 space-y-1 col-span-2 lg:col-span-1">
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Avg AI Confidence</span>
              <span className="text-2xl font-black text-white">{avgConfidence}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Repair Cost & Health Score Trends */}
            <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-brand-cyan" />
                Cost and Health Index Trend Over Time
              </h3>
              
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                    <YAxis yAxisId="left" stroke="#818cf8" style={{ fontSize: 9, fontFamily: "monospace" }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" style={{ fontSize: 9, fontFamily: "monospace" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", color: "#f8fafc" }} />
                    <Legend style={{ fontSize: 10 }} />
                    <Area yAxisId="left" type="monotone" dataKey="cost" name="Repair Cost (₹)" stroke="#818cf8" fillOpacity={1} fill="url(#colorCost)" />
                    <Area yAxisId="right" type="monotone" dataKey="health" name="Health Score" stroke="#06b6d4" fillOpacity={1} fill="url(#colorHealth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Damage Category Distribution (Recharts Pie) */}
            <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <PieChartIcon className="h-4 w-4 text-brand-cyan" />
                Damage Distribution
              </h3>

              <div className="h-[200px] relative flex items-center justify-center">
                {damageChartData.length === 0 ? (
                  <span className="text-xs text-slate-500 italic block">No defects present.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={damageChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {damageChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", color: "#f8fafc" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pie Legends */}
              <div className="grid grid-cols-2 gap-2 text-[10px] mt-4 font-mono">
                {damageChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-400">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brands distribution BarChart */}
            <div className="glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-brand-cyan" />
                Vehicle Brand Distribution
              </h3>
              
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                    <Bar dataKey="value" name="Inspected Cars" fill="#06b6d4">
                      {brandChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Average repair cost distribution */}
            <div className="glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/30 flex flex-col justify-center space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-brand-cyan" />
                Average Cost Metrics (INR)
              </h3>

              <div className="space-y-4 pt-2">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase">Average Repair Quote</span>
                    <span className="text-2xl font-black text-white">{formatINR(avgCost)}</span>
                  </div>
                  <div className="h-10 w-10 bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald rounded-xl flex items-center justify-center font-bold">
                    ₹
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase">Total Repair Liability Sum</span>
                    <span className="text-2xl font-black text-white">
                      {formatINR(history.reduce((acc, item) => acc + item.minCost, 0))}
                    </span>
                  </div>
                  <div className="h-10 w-10 bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo rounded-xl flex items-center justify-center font-bold">
                    Σ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
