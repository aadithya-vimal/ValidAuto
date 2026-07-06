"use client";

import Link from "next/link";
import { 
  ArrowRight, Cpu, ShieldAlert, Sparkles, Activity, FileText, 
  Settings, CheckCircle, BarChart3, HelpCircle, Layers, ShieldCheck
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative isolate overflow-hidden bg-slate-950 text-white min-h-screen">
      {/* Background Gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-indigo to-brand-cyan opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-20 sm:pb-24 lg:flex lg:px-8 lg:py-20 items-center justify-between">
        {/* Left Side Info */}
        <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:max-w-xl">
          <div className="mt-16 sm:mt-24 lg:mt-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-indigo/10 px-3 py-1 text-xs font-semibold text-brand-cyan border border-brand-indigo/20">
              <Sparkles className="h-3 w-3" />
              ValidAuto V3.0 Live - Professional Damage Auditing
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            AI-Powered Vehicle Damage Auditing
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Upload vehicle exterior photos, execute deep learning classification scans instantly, and generate structured repair cost audits in Indian Rupees (₹) with claim readiness indicators.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-indigo/25 hover:shadow-brand-indigo/40 transition-all hover:scale-[1.02]"
            >
              <Cpu className="h-5 w-5 animate-pulse" />
              Launch Scanner
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              View Saved Logs
            </Link>
          </div>
        </div>

        {/* Right Side Visual Showcase */}
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-20">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="glass-panel relative rounded-2xl p-2 shadow-2xl shadow-slate-950/70 border-white/10">
              <div className="relative overflow-hidden rounded-xl bg-slate-950/80 aspect-16/9 w-[500px] max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/car_scan.jpg"
                  alt="ValidAuto Scan Interface Mockup"
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    // Fallback visual if car_scan.jpg does not exist
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                
                {/* Scanning Laser HUD effect */}
                <div className="absolute inset-0 bg-brand-cyan/5">
                  <div className="absolute top-1/3 left-0 h-[2px] w-full bg-brand-cyan shadow-[0_0_10px_#06b6d4] animate-scan" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/40">
                    <Cpu className="h-12 w-12 text-brand-cyan animate-spin-slow mb-3" />
                    <span className="font-mono text-xs text-brand-cyan uppercase tracking-widest font-black">ValidAuto Neural Core v3.0</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">MOBILE-NET-V2 • IMAGENET weights</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-cyan uppercase tracking-wider">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Streamlined AI Inspections & Diagnostics
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
            {/* Feat 1 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all border-white/5 bg-slate-900/25">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-indigo/10 text-brand-indigo">
                  <Activity className="h-5 w-5" />
                </div>
                Computer Vision Analysis
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-sm leading-7 text-slate-400">
                <p className="flex-auto">
                  Processes uploaded panel photos using convolutional layers to classify dent and scratch defects instantly.
                </p>
              </dd>
            </div>
            {/* Feat 2 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all border-white/5 bg-slate-900/25">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-rose/10 text-brand-rose">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                Severity & Risk Profiling
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-sm leading-7 text-slate-400">
                <p className="flex-auto">
                  Automatically gauges damage severity (Low, Moderate, High) and assesses driving roadworthiness risks.
                </p>
              </dd>
            </div>
            {/* Feat 3 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all border-white/5 bg-slate-900/25">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
                  <FileText className="h-5 w-5" />
                </div>
                Detailed Inspection Reports
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-sm leading-7 text-slate-400">
                <p className="flex-auto">
                  Generates professional reports including health index scores, INR repair costs, and required claim documents.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 border-t border-white/5 bg-slate-950/40">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-brand-cyan uppercase tracking-wider">Operational Workflow</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How ValidAuto Inspection Works
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Upload Exterior Image", desc: "Select a clear JPG/PNG photo of the vehicle panel or collision impact site." },
            { step: "02", title: "Neural Scan", desc: "MobileNetV2 processes the image in milliseconds to isolate body abnormalities." },
            { step: "03", title: "Automatic Report", desc: "System compiles cost estimates in INR (₹), health indices, and document checklists." },
            { step: "04", title: "Download PDF & Log", desc: "Export an official audit sheet instantly and access historical scans under browser logs." }
          ].map((item, idx) => (
            <div key={idx} className="relative rounded-2xl bg-white/5 p-6 border border-white/5 flex flex-col justify-between min-h-[160px]">
              <div>
                <span className="block text-3xl font-black text-brand-cyan/20 font-mono mb-2">{item.step}</span>
                <h4 className="text-base font-bold text-white mb-2">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Pipeline & Technology Stack Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* AI Pipeline details */}
          <div className="space-y-6">
            <h2 className="text-base font-semibold leading-7 text-brand-indigo uppercase tracking-wider">AI Inference Pipeline</h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">Machine Learning Diagnostic Architecture</h3>
            <p className="text-slate-300 leading-relaxed">
              ValidAuto utilizes deep transfer learning with an ImageNet pre-trained MobileNetV2 feature extractor. This architecture allows rapid bottleneck feature compilation and high-accuracy classification without requiring massive local resources.
            </p>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">1. INPUT PREPROCESSING</span>
                <span className="text-white">Rescale (224x224x3) & Normalize [-1, 1]</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">2. FEATURE MAP EXTRACTION</span>
                <span className="text-white">MobileNetV2 (Frozen Base Conv Layers)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">3. GAP & DROPOUT</span>
                <span className="text-white">GlobalAveragePooling2D + 30% Dropout</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">4. CLASSIFICATION TENSOR</span>
                <span className="text-white">Dense (Softmax Activation)</span>
              </div>
            </div>
          </div>

          {/* Tech Stack Box */}
          <div className="glass-panel rounded-2xl p-8 border-white/10 bg-slate-900/50 space-y-6">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-cyan" />
              Technology Stack
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Frontend Framework</span>
                <span className="text-sm font-semibold text-white">Next.js 14 / React</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Styling Framework</span>
                <span className="text-sm font-semibold text-white">Tailwind CSS</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Backend Server</span>
                <span className="text-sm font-semibold text-white">FastAPI (Python 3.11)</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold">ML Environment</span>
                <span className="text-sm font-semibold text-white">TensorFlow 2.21 / Keras 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Accuracy Statistics Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 border-t border-white/5 bg-slate-950/25 text-center">
        <div className="mx-auto max-w-2xl lg:text-center mb-12">
          <h2 className="text-base font-semibold leading-7 text-brand-cyan uppercase tracking-wider">Evaluation Metrics</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Trained Classifier Accuracy
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Validated on the official Kaggle vehicle damage classification split (920 images per class)
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { val: "93.30%", label: "Validation Accuracy" },
            { val: "91.95%", label: "Test Accuracy" },
            { val: "94.44%", label: "Precision Rate" },
            { val: "91.48%", label: "F1 Score" }
          ].map((item, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-2xl border-white/5 bg-slate-900/40">
              <span className="block text-3xl font-black text-white bg-gradient-to-r from-brand-indigo to-brand-cyan bg-clip-text text-transparent">{item.val}</span>
              <span className="block text-xs text-slate-400 mt-2 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 lg:px-8 py-10 border-t border-white/5 text-center text-xs text-slate-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/analysis" className="hover:text-white transition-colors">Scanner</Link>
          <Link href="/history" className="hover:text-white transition-colors">Inspection History</Link>
          <Link href="/about" className="hover:text-white transition-colors">About AI Core</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} ValidAuto Systems. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-slate-600">ISO 9001:2015 Evaluator Node • Developed for academic research presentations.</p>
      </footer>
    </div>
  );
}
