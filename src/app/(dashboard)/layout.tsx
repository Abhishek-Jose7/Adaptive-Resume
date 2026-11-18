"use client";

import React from "react";
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
  User,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Data Bank", href: "/bank", icon: Database },
    { label: "Data Intake", href: "/bank/intake", icon: UploadCloud },
    { label: "Target Jobs", href: "/jobs", icon: Briefcase },
    { label: "Resumes", href: "/resumes", icon: FileText },
    { label: "Applications Tracker", href: "/applications", icon: Kanban },
    { label: "Cover Letters", href: "/cover-letters", icon: Mail },
    { label: "AI & BYOK Keys", href: "/settings/providers", icon: Key },
    { label: "Privacy & Data", href: "/settings/privacy", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/bank" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                R
              </div>
              <div>
                <span className="font-bold text-gray-900 tracking-tight text-lg">Resume Maker</span>
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                  \$0 Free Tier
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/bank" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings/providers"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-md hover:bg-gray-100 flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs border border-blue-200">
              U
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        Resume Maker • Built strictly to PRD v1.1 • Truth-bound AI • Browser compute &amp; Neon PostgreSQL
      </footer>
    </div>
  );
}
