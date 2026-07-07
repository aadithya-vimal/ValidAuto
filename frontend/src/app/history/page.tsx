"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  History as HistoryIcon, Calendar, Trash2, Cpu, 
  IndianRupee, Search, SlidersHorizontal, ArrowUpDown,
  Download, Eye, RefreshCw
} from "lucide-react";

interface LiveAPIResponse {
  quality: {
    resolution: string;
    brightness: number;
    blur_score: number;
    rating: "Excellent" | "Good" | "Fair" | "Poor" | "Rejected";
    suitability: string;
    reason: string;
  };
  ocr?: {
    registration: { value: string | null; confidence: number; uncertain_indices: number[] };
    vin: { value: string | null; confidence: number; uncertain_indices: number[] };
    chassis: { value: string | null; confidence: number; uncertain_indices: number[] };
  };
  images: {
    original: string;
    enhanced: string;
    heatmap: string;
    localized: string;
  };
  primary_detection: {
    label: "Damage" | "No Damage" | "Rejected";
    confidence: number;
  };
  secondary_classification: {
    label: string;
    confidence: number;
  };
  report: {
    vehicle_info: {
      owner_name: string;
      make: string;
      model_name: string;
      variant: string;
      year: number;
      reg_number: string;
      vin: string;
      odometer: number;
      insurance_provider: string;
      policy_number: string;
    };
    health_score: number;
    health_explanation: string;
    severity: string;
    repair_costs: {
      parts: number;
      labour: number;
      paint: number;
      gst: number;
      total: number;
    };
    repair_timeline: {
      working_hours: number;
      repair_days: number;
      completion_date: string;
    };
    insurance: {
      recommendation: string;
      reason: string;
      required_docs: string[];
    };
    safety: {
      roadworthy: string;
      night_driving_safe: string;
      highway_safe: string;
      rain_driving_safe: string;
      long_distance_safe: string;
      immediate_repair_required: string;
      reason: string;
    };
    localization: {
      coverage_pct: number;
      num_regions: number;
      largest_region_pct: number;
      affected_area: string;
    };
    maintenance: string[];
    description: string;
    possible_cause: string;
    explanation: string;
    timestamp: string;
    inference_time_seconds: number;
  } | null;
}

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
  fullResult?: LiveAPIResponse;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "health" | "cost">("date");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterDamage, setFilterDamage] = useState<string>("all");
  
  // Undo Delete state
  const [deletedItem, setDeletedItem] = useState<HistoryItem | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

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
    e.stopPropagation();
    const itemToDelete = history.find(item => item.id === id);
    if (itemToDelete) {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem("validauto_history", JSON.stringify(updated));
      
      // hit the delete backend API route
      fetch(`${API_BASE_URL}/reports/${id}`, { method: "DELETE" }).catch(() => {});

      // Save for Restore
      setDeletedItem(itemToDelete);
      setShowUndoBanner(true);

      // Hide banner after 6s
      setTimeout(() => {
        setShowUndoBanner(false);
      }, 6000);
    }
  };

  const handleRestore = () => {
    if (deletedItem) {
      const updated = [deletedItem, ...history];
      setHistory(updated);
      localStorage.setItem("validauto_history", JSON.stringify(updated));
      setShowUndoBanner(false);
      setDeletedItem(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all history records?")) {
      localStorage.removeItem("validauto_history");
      setHistory([]);
    }
  };

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

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleItemClick = async (item: HistoryItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${item.id}`);
      if (response.ok) {
        const fullResult = await response.json();
        localStorage.setItem("validauto_current_analysis", JSON.stringify(fullResult));
        router.push("/analysis");
        return;
      }
    } catch (e) {
      console.warn("Backend report query failed, using offline fallback:", e);
    }

    if (item.fullResult) {
      localStorage.setItem("validauto_current_analysis", JSON.stringify(item.fullResult));
    } else {
      // Reconstruct simple LiveAPIResponse for legacy items without fullResult
      const reconstructed: LiveAPIResponse = {
        quality: {
          resolution: "1280 x 720 px",
          brightness: 110.45,
          blur_score: 85.32,
          rating: "Good",
          suitability: "Suitable",
          reason: "Legacy log reconstruction."
        },
        images: {
          original: item.imageSrc,
          enhanced: item.imageSrc,
          heatmap: item.imageSrc,
          localized: item.imageSrc
        },
        primary_detection: {
          label: item.damage === "none" ? "No Damage" : "Damage",
          confidence: item.confidence
        },
        secondary_classification: {
          label: item.damage.toUpperCase(),
          confidence: item.confidence
        },
        report: {
          vehicle_info: {
            owner_name: item.ownerName,
            make: item.make || "N/A",
            model_name: item.modelName || "N/A",
            variant: "N/A",
            year: 2020,
            reg_number: item.filename,
            vin: "N/A",
            odometer: 50000,
            insurance_provider: "N/A",
            policy_number: "N/A"
          },
          health_score: item.healthScore,
          health_explanation: "Legacy record restored from database logs.",
          severity: item.severity,
          repair_costs: {
            parts: 0,
            labour: Math.floor(item.minCost * 0.4),
            paint: Math.floor(item.minCost * 0.6),
            gst: Math.floor(item.minCost * 0.18),
            total: item.minCost
          },
          repair_timeline: {
            working_hours: 6,
            repair_days: 2,
            completion_date: new Date(item.timestamp).toISOString().split("T")[0]
          },
          insurance: {
            recommendation: item.severity === "Severe" ? "Immediate Inspection Required" : "Self Repair Recommended",
            reason: "Legacy claim status.",
            required_docs: []
          },
          safety: {
            roadworthy: item.severity === "Severe" ? "Unsafe" : "Safe",
            night_driving_safe: item.severity === "Severe" ? "Unsafe" : "Safe",
            highway_safe: item.severity === "Severe" ? "Unsafe" : "Safe",
            rain_driving_safe: item.severity === "Severe" ? "Unsafe" : "Safe",
            long_distance_safe: item.severity === "Severe" ? "Unsafe" : "Safe",
            immediate_repair_required: item.severity === "Severe" ? "Yes" : "No",
            reason: "Legacy safety record."
          },
          localization: {
            coverage_pct: 2.5,
            num_regions: 1,
            largest_region_pct: 2.5,
            affected_area: "Panel"
          },
          maintenance: [],
          description: "Legacy defect log details.",
          possible_cause: "Unknown.",
          explanation: "Reconstructed from audit trail.",
          timestamp: item.timestamp,
          inference_time_seconds: 0.05
        }
      };
      localStorage.setItem("validauto_current_analysis", JSON.stringify(reconstructed));
    }
    router.push("/analysis");
  };

  const filteredItems = history
    .filter(item => {
      const matchSearch = 
        (item.filename?.toLowerCase() || "").includes(search.toLowerCase()) || 
        (item.ownerName?.toLowerCase() || "").includes(search.toLowerCase());
      
      const matchSeverity = filterSeverity === "all" || (item.severity?.toLowerCase() || "") === filterSeverity.toLowerCase();
      const matchDamage = filterDamage === "all" || (item.damage?.toLowerCase() || "") === filterDamage.toLowerCase();
      
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
            Access, sort, and manage machine learning diagnostics generated locally in this browser.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2.5 text-xs font-bold text-white shadow shadow-brand-indigo/15 hover:opacity-95 transition-all"
          >
            <Cpu className="h-4 w-4" />
            New Scan
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-rose/20 bg-brand-rose/5 px-4 py-2.5 text-xs font-bold text-brand-rose hover:bg-brand-rose/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Undo Banner */}
      {showUndoBanner && (
        <div className="bg-brand-indigo/90 border border-brand-indigo/50 text-white px-4 py-3.5 rounded-xl shadow-lg flex items-center justify-between text-sm animate-slide-in">
          <span className="font-medium">Inspection record deleted.</span>
          <button 
            onClick={handleRestore}
            className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-md text-xs font-black transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            UNDO
          </button>
        </div>
      )}

      {/* Main content list */}
      {history.length === 0 ? (
        <div className="glass-panel text-center py-20 rounded-2xl border-white/5 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-indigo/10 text-brand-indigo">
            <HistoryIcon className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No history records found</h3>
            <p className="mt-1 text-sm text-slate-400">Scan a vehicle to generate your first audit record.</p>
          </div>
          <div className="pt-2">
            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-5 py-2.5 text-sm font-bold text-white shadow shadow-brand-indigo/20 hover:opacity-95"
            >
              Start First Scan
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-panel p-4 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by registration number or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* Filters / Sorting */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-brand-cyan"
                >
                  <option value="all">All Severities</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>

                <select
                  value={filterDamage}
                  onChange={(e) => setFilterDamage(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-brand-cyan"
                >
                  <option value="all">All Defects</option>
                  <option value="none">No Damage</option>
                  <option value="scratch">Scratch</option>
                  <option value="dent">Dent</option>
                  <option value="bumper">Bumper</option>
                  <option value="glass">Glass</option>
                </select>
              </div>

              <div className="flex items-center gap-2 border-l border-white/5 pl-3">
                <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-brand-cyan"
                >
                  <option value="date">Sort by Date</option>
                  <option value="health">Sort by Health</option>
                  <option value="cost">Sort by Cost</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isWhole = item.damage.toLowerCase() === "none";
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="glass-panel glass-panel-hover overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 flex flex-col justify-between cursor-pointer"
                >
                  {/* Image & Date badge */}
                  <div className="relative aspect-video bg-slate-950/80 overflow-hidden border-b border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageSrc}
                      alt={item.filename}
                      className="w-full h-full object-cover opacity-85"
                    />

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
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            item.severity === "Severe" ? "bg-brand-rose/10 text-brand-rose border-brand-rose/20" :
                            item.severity === "Moderate" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20"
                          }`}>
                            {item.severity}
                          </span>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1 rounded-md text-slate-500 hover:text-brand-rose hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-lg font-bold text-white capitalize">
                        {isWhole ? "No Damage Detected" : item.damage}
                      </h4>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <p>Owner: {item.ownerName}</p>
                        <p>Scan: {new Date(item.timestamp).toLocaleDateString()}</p>
                      </div>
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
    </div>
  );
}
