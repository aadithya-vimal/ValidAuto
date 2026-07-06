"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield, Menu, X, Cpu } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Analysis", href: "/analysis" },
    { name: "History", href: "/history" },
    { name: "Analytics", href: "/analytics" },
    { name: "About", href: "/about" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-cyan p-[1.5px] transition-transform duration-300 group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                  <Shield className="h-5 w-5 text-brand-cyan transition-colors duration-300 group-hover:text-brand-indigo" />
                </div>
                <div className="absolute -inset-0.5 -z-10 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-cyan opacity-40 blur-sm group-hover:opacity-75 transition-opacity" />
              </div>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                Valid<span className="text-brand-cyan font-semibold">Auto</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center gap-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-brand-indigo to-brand-cyan rounded-full" />
                    )}
                  </Link>
                );
              })}
              <Link
                href="/analysis"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-indigo/20 hover:opacity-95 hover:shadow-brand-indigo/35 transition-all duration-300 hover:scale-[1.02]"
              >
                <Cpu className="h-4 w-4" />
                Start Scan
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-white/5 bg-slate-950/95 backdrop-blur-lg" id="mobile-menu">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-base font-medium ${
                    isActive
                      ? "bg-white/5 text-white border-l-2 border-brand-cyan"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="px-3 pt-4 pb-2">
              <Link
                href="/analysis"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95 transition-all"
              >
                <Cpu className="h-4 w-4" />
                Start Scan
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
