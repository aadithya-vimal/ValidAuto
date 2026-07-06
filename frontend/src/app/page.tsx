"use client";

import Link from "next/link";
import { ArrowRight, Cpu, ShieldAlert, Sparkles, Activity, FileText } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative isolate overflow-hidden">
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

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-24">
        {/* Left Side Info */}
        <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-indigo/10 px-3 py-1 text-xs font-semibold text-brand-cyan border border-brand-indigo/20">
              <Sparkles className="h-3 w-3" />
              Phase 1 Live - Automated Assessment
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Instant AI Vehicle Damage Assessment
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Upload vehicle damage photos, run instant computer vision scans, and generate structured repair cost estimates. Get professional insurance-ready reports in seconds.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-indigo/25 hover:shadow-brand-indigo/40 transition-all hover:scale-[1.02]"
            >
              <Cpu className="h-5 w-5 animate-pulse" />
              Start Assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/about" className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors">
              Learn how it works <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Right Side Visual Showcase */}
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-20">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="glass-panel relative rounded-2xl p-2 shadow-2xl shadow-slate-950/70 border-white/10">
              <div className="relative overflow-hidden rounded-xl bg-slate-950/80 aspect-16/9 w-[540px] max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/car_scan.jpg"
                  alt="Vehicle Scan Interface Mockup"
                  className="w-full h-full object-cover opacity-80"
                />
                
                {/* Scanning Laser HUD effect */}
                <div className="absolute inset-0 bg-brand-cyan/5">
                  <div className="absolute top-1/3 left-0 h-[2px] w-full bg-brand-cyan shadow-[0_0_10px_#06b6d4] animate-scan" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-cyan uppercase tracking-wider">Streamlined Diagnostics</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need for immediate car damage reporting
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {/* Feat 1 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-indigo/10 text-brand-indigo">
                  <Activity className="h-5 w-5" />
                </div>
                Computer Vision Analysis
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                <p className="flex-auto">
                  Automatically isolate dents, scratches, broken light covers, and misaligned panels from raw photos.
                </p>
              </dd>
            </div>
            {/* Feat 2 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-rose/10 text-brand-rose">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                Part & Severity Labeling
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                <p className="flex-auto">
                  Categorize body damage by severity levels (High, Moderate, Low) with confidence metrics per component.
                </p>
              </dd>
            </div>
            {/* Feat 3 */}
            <div className="glass-panel glass-panel-hover flex flex-col rounded-2xl p-6 transition-all">
              <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
                  <FileText className="h-5 w-5" />
                </div>
                Printable Damage Reports
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                <p className="flex-auto">
                  Compile cost ranges and repair suggestions into standard formatted documents you can easily download or print.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
