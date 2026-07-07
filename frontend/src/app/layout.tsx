import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ValidAuto - Intelligent Vehicle Damage Assessment",
  description: "Get instant vehicle damage scanning and repair cost estimates powered by computer vision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-cyan/20 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        {/* Footer */}
        <footer className="border-t border-white/5 bg-slate-950/40 py-8 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4">
            <p>© {new Date().getFullYear()} ValidAuto Systems. All rights reserved.</p>
            <p className="mt-1 text-slate-600 font-mono text-[10px]">ValidAuto Evaluator Node • Academic Research Presentation</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
