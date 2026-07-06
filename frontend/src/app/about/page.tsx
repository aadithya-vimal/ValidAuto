"use client";

import { Cpu, ShieldCheck, Heart, Sparkles, BookOpen, Layers, LineChart } from "lucide-react";

export default function AboutPage() {
  const techStack = [
    {
      category: "Frontend",
      tech: "Next.js 15 (App Router)",
      desc: "Fast, SEO-friendly React framework providing static/dynamic server-side rendering and client routing.",
    },
    {
      category: "Styling",
      tech: "Tailwind CSS v4",
      desc: "The next generation of Tailwind CSS with a native CSS-first configuration and lightning-fast compiler.",
    },
    {
      category: "Language",
      tech: "TypeScript",
      desc: "Static type-safety across layouts, component props, and API request schemas.",
    },
    {
      category: "Backend",
      tech: "FastAPI (Python)",
      desc: "High-performance, ASGI-compatible web framework built on standard Python type hints.",
    },
  ];

  const conceptualSteps = [
    {
      step: "01",
      title: "Image Acquisition",
      desc: "The user uploads high-resolution photos of vehicle panels (fenders, doors, lights, bumpers) from multiple angles.",
    },
    {
      step: "02",
      title: "Spatial Segmentation",
      desc: "Computer vision models outline anomalous boundary contours, classifying scrapes, cracks, paint transfer, and structural dents.",
    },
    {
      step: "03",
      title: "Severity Indexing",
      desc: "Damage severity is mapped to a three-tier index (High, Moderate, Low) combined with a model confidence percentage rating.",
    },
    {
      step: "04",
      title: "Cost Extrapolation",
      desc: "Aggregates parts catalogs and local labor averages to construct a ballpark repair budget prior to manual insurance review.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12 flex-1">
      {/* Page Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          About AutoShield AI
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Learn about our mission, technological blueprints, and model performance metrics.
        </p>
      </div>

      {/* Hero Mission Section */}
      <div className="glass-panel rounded-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-brand-indigo/10 blur-3xl rounded-full" />
        
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full px-2.5 py-1 text-xs text-brand-cyan font-semibold">
            <Sparkles className="h-3 w-3" />
            Our Vision
          </span>
          <h2 className="text-2xl font-bold text-white">Accelerating claims through modern computer vision</h2>
          <p className="text-slate-300 leading-relaxed">
            AutoShield AI was founded as a conceptual exploration into automating vehicle damage inspections. 
            By merging high-performance API structures with real-time browser visualizers, we aim to minimize 
            the friction between fender benders and insurance checks. In Phase 2 and 3, we successfully trained 
            a transfer-learning model on MobileNetV2 features and built a structured local report generator.
          </p>
        </div>
      </div>

      {/* Model Performance Graphics Section (Phase 4) */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <LineChart className="h-5 w-5 text-brand-cyan" />
          Model Evaluation Metrics & Training Curves
        </h3>
        <p className="text-sm text-slate-400 leading-normal">
          The following graphs are generated directly in the backend after data preprocessing, augmentation, 
          and training. They show how validation accuracy progresses and map the classification confusion matrix.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Training & Validation Accuracy Graph</h4>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950/50 border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/accuracy_graph.png"
                alt="Model Accuracy curves over epochs"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Confusion Matrix Grid</h4>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950/50 border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/confusion_matrix.png"
                alt="Confusion Matrix classified cells"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conceptual Blueprint */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-indigo" />
          The Assessment Blueprint
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {conceptualSteps.map((item) => (
            <div key={item.step} className="glass-panel glass-panel-hover rounded-2xl p-6 relative">
              <span className="absolute right-4 top-4 text-4xl font-extrabold text-white/5 tracking-wider select-none">
                {item.step}
              </span>
              <h4 className="text-base font-bold text-white mb-2">{item.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Breakdown */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-cyan" />
          Technology Stack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {techStack.map((item) => (
            <div key={item.tech} className="glass-panel rounded-2xl p-6 flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-brand-cyan">
                {item.category === "Frontend" || item.category === "Styling" ? (
                  <Cpu className="h-5 w-5 text-brand-cyan" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-brand-indigo" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {item.category}
                </span>
                <h4 className="text-base font-bold text-white">{item.tech}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Team / Support Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-8 text-slate-400 text-xs">
        <span className="flex items-center gap-1.5">
          Made with <Heart className="h-3.5 w-3.5 text-brand-rose fill-brand-rose/20" /> for the Samsung Coding project.
        </span>
        <span className="mt-2 sm:mt-0">Version 1.0.0 (Phase 1 Baseline)</span>
      </div>
    </div>
  );
}
