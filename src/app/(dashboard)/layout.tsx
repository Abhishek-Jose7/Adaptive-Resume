"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  UploadCloud,
  Briefcase,
  FileText,
  Kanban,
  Mail,
  Key,
  ShieldCheck,
  Compass,
  Gauge,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  User,
} from "lucide-react";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems = [
    { label: "Data Bank", href: "/bank", icon: Database },
    { label: "Data Intake", href: "/bank/intake", icon: UploadCloud },
    { label: "Target Jobs", href: "/jobs", icon: Briefcase },
    { label: "Resumes", href: "/resumes", icon: FileText },
    { label: "Applications Tracker", href: "/applications", icon: Kanban },
    { label: "Cover Letters", href: "/cover-letters", icon: Mail },
  ];

  const secondaryNavItems = [
    { label: "Quotas & Limits", href: "/settings/usage", icon: Gauge },
    { label: "AI & BYOK Keys", href: "/settings/providers", icon: Key },
    { label: "Privacy & Data", href: "/settings/privacy", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Top Navbar */}
      <header className="bg-gray-900/90 border-b border-gray-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                R
              </div>
              <div className="flex items-center">
                <span className="font-bold text-white tracking-tight text-base">Resume Maker</span>
                <span className="ml-2.5 px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded-full font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  \$0 Free Tier
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/bank" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/settings/usage"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 border border-gray-800 transition-colors"
            >
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Quotas</span>
            </Link>

            <Link
              href="/settings/providers"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 border border-gray-800 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>BYOK</span>
            </Link>

            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full border border-blue-500/40 shadow-sm",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg xl:hidden hover:bg-gray-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 space-y-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">
              Modules
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/bank" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 pt-2">
              Settings &amp; Limits
            </div>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Sub-nav Secondary Header for Desktop */}
      <div className="hidden md:block bg-gray-900/40 border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-gray-500">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="capitalize text-white font-medium">
              {pathname?.split("/")[1] || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Truth-Bound AI: Zero Fabrications
            </span>
            <span className="text-gray-600">|</span>
            <span className="font-mono text-gray-400">PRD v1.2</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/80 border-t border-gray-800/80 py-4 text-xs text-gray-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Resume Maker • Grounded in Candidate Data Bank • Serverless Neon DB</span>
          <div className="flex items-center gap-4 text-gray-400">
            <Link href="/settings/privacy" className="hover:text-white">
              Data Privacy
            </Link>
            <Link href="/settings/usage" className="hover:text-white">
              Transparent Quotas
            </Link>
            <Link href="/settings/providers" className="hover:text-white">
              BYOK Keys
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
