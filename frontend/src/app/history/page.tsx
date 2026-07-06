"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  History as HistoryIcon, Calendar, Trash2, ArrowLeft, Cpu, Activity, 
  ShieldAlert, IndianRupee, Sparkles, Search, SlidersHorizontal, ArrowUpDown,
  Download, Eye, X, FileText
} from "lucide-react";

interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string; // Registration Number
  ownerName: string;
  make?: string;
  modelName?: string;
  imageSrc: string;
  damage: string;
  confidence: number;
  severity: string;
  healthScore: number;
  minCost: number;
  maxCost: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "health" | "cost">("date");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterDamage, setFilterDamage] = useState<string>("all");
  
  // Modal viewer state
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("validauto_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse history logs:", err);
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    if (confirm("Are you sure you want to delete this inspection record?")) {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem("validauto_history", JSON.stringify(updated));
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all history records?")) {
      localStorage.removeItem("validauto_history");
      setHistory([]);
    }
  };

  // Export Entire Logs to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Timestamp", "RegNumber", "Owner", "DamageType", "Severity", "HealthScore", "Cost"];
    const rows = history.map(i => [
      i.id,
      i.timestamp,
      i.filename,
      i.ownerName,
      i.damage,
      i.severity,
      i.healthScore,
      i.minCost
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `validauto_inspections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter and Sort logs
  const filteredItems = history
    .filter(item => {
      const matchSearch = 
        item.filename.toLowerCase().includes(search.toLowerCase()) || 
        item.ownerName.toLowerCase().includes(search.toLowerCase());
      
      const matchSeverity = filterSeverity === "all" || item.severity.toLowerCase() === filterSeverity.toLowerCase();
      const matchDamage = filterDamage === "all" || item.damage.toLowerCase() === filterDamage.toLowerCase();
      
      return matchSearch && matchSeverity && matchDamage;
    })
    .sort((a, b) => {
      if (sortBy === "health") return b.healthScore - a.healthScore;
      if (sortBy === "cost") return b.minCost - a.minCost;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <HistoryIcon className="h-8 w-8 text-brand-cyan" />
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
            <>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-rose/20 bg-brand-rose/5 px-4 py-2.5 text-xs font-bold text-brand-rose hover:bg-brand-rose/10 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Clear Logs
              </button>
            </>
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
        <div className="space-y-6">
          {/* Controls Bar (Search, Filter, Sort) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
            {/* Search */}
            <div className="md:col-span-4 relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Owner or Reg No..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* Filter Severity */}
            <div className="md:col-span-2.5 flex items-center gap-2 text-xs">
              <SlidersHorizontal className="h-4 w-4 text-slate-500 shrink-0" />
              <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-cyan"
              >
                <option value="all">All Severities</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>

            {/* Filter Damage Type */}
            <div className="md:col-span-2.5 flex items-center gap-2 text-xs">
              <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0" />
              <select 
                value={filterDamage} 
                onChange={(e) => setFilterDamage(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-cyan"
              >
                <option value="all">All Defects</option>
                <option value="none">No Damage</option>
                <option value="scratch">Scratch</option>
                <option value="dent">Dent</option>
                <option value="bumper">Bumper</option>
                <option value="glass">Glass</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-3 flex items-center gap-2 text-xs">
              <ArrowUpDown className="h-4 w-4 text-slate-500 shrink-0" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-cyan"
              >
                <option value="date">Sort by Scan Date</option>
                <option value="health">Sort by Health Score</option>
                <option value="cost">Sort by Quote Cost</option>
              </select>
            </div>
          </div>

          {/* Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isWhole = item.damage.toLowerCase() === "none";
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => setActiveItem(item)}
                  className="glass-panel glass-panel-hover overflow-hidden rounded-2xl border-white/5 bg-slate-900/40 flex flex-col justify-between cursor-pointer"
                >
                  {/* Image & Date badge */}
                  <div className="relative aspect-video bg-slate-950/80 overflow-hidden border-b border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageSrc}
                      alt={item.filename}
                      className="w-full h-full object-cover opacity-85"
                    />
                    
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[9px] bg-slate-950/85 border border-white/10 px-2.5 py-1 rounded-md text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-brand-cyan" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>

                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9px] bg-slate-950/85 border border-white/10 px-2.5 py-1 rounded-md text-white font-bold">
                      Health Score: {item.healthScore}/100
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-bold uppercase truncate max-w-[130px]">
                          {item.filename}
                        </span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          item.severity === "Severe" ? "bg-brand-rose/10 text-brand-rose border-brand-rose/20" :
                          item.severity === "Moderate" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20"
                        }`}>
                          {item.severity}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-white capitalize">
                        {isWhole ? "No Damage Detected" : item.damage}
                      </h4>
                      <p className="text-[10px] text-slate-400">Owner: {item.ownerName}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald shrink-0">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-500 uppercase">Rate Quote</span>
                          <span className="block text-xs font-bold text-white">
                            {item.minCost > 0 ? formatCurrency(item.minCost) : "₹0 (Clean)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                        <span>Open Report</span>
                        <Eye className="h-4 w-4 text-brand-cyan" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Inspector Details Viewer */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-white/10 bg-slate-900 shadow-2xl p-6 relative space-y-6">
            <button 
              onClick={() => setActiveItem(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                <FileText className="h-5.5 w-5.5 text-brand-cyan" />
                Inspection Audit details
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Record: {activeItem.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Registration No</span>
                <span className="font-bold text-white">{activeItem.filename}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Owner Name</span>
                <span className="font-bold text-white">{activeItem.ownerName}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Damage Type</span>
                <span className="font-bold text-white capitalize">{activeItem.damage}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Severity Level</span>
                <span className="font-bold text-white">{activeItem.severity}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Health Index</span>
                <span className="font-bold text-brand-indigo">{activeItem.healthScore}/100</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase">Total Cost Quote</span>
                <span className="font-bold text-brand-emerald">{formatCurrency(activeItem.minCost)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end gap-2.5">
              <button
                onClick={(e) => {
                  handleDelete(activeItem.id, e);
                  setActiveItem(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-rose/20 bg-brand-rose/5 px-4 py-2 text-xs font-bold text-brand-rose hover:bg-brand-rose/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </button>
              <button
                onClick={() => setActiveItem(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
