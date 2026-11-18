"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Download,
  Database,
  FileText,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { FreeTierUsageReport } from "@/lib/services/usageLimitService";
import Link from "next/link";

export function UsageLimitsDashboard() {
  const [report, setReport] = useState<FreeTierUsageReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/usage/limits");
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const calculatePct = (used: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getMeterColor = (pct: number) => {
    if (pct >= 90) return "bg-rose-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-blue-500";
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Header */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Free-Tier Usage &amp; Transparent Quotas
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                PRD 18.9
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Clear quotas before you begin. Zero surprise paywalls or hidden credit card requirements.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors self-start sm:self-auto"
          title="Refresh Quota Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Honest Free-Tier Banner */}
      <div className="px-5 py-3 bg-gray-900/40 border-b border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-gray-300">
            Period: <strong className="text-white font-mono">{report?.monthlyPeriod || "Current Month"}</strong> • Cost: <strong className="text-emerald-400 font-mono">\$0.00 / mo</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">Active Engine:</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-blue-400 font-mono text-[11px] flex items-center gap-1">
            <Key className="w-3 h-3" />
            {report?.hasCustomApiKey ? `BYOK (${report.activeProvider})` : "Shared Free Tier"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {loading ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs">Checking real-time usage quotas from Neon database...</p>
          </div>
        ) : !report ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            Unable to fetch usage report.
          </div>
        ) : (
          <div className="space-y-5">
            {/* 4 Quota Meter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* AI Generations */}
              <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" /> AI Tailoring Runs
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {report.aiGenerationsUsed} / {report.hasCustomApiKey ? "∞" : report.aiGenerationsLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getMeterColor(
                      calculatePct(report.aiGenerationsUsed, report.aiGenerationsLimit)
                    )}`}
                    style={{
                      width: report.hasCustomApiKey
                        ? "10%"
                        : `${calculatePct(report.aiGenerationsUsed, report.aiGenerationsLimit)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 block">
                  {report.hasCustomApiKey
                    ? "Unlimited via your custom BYOK key"
                    : `${report.aiGenerationsLimit - report.aiGenerationsUsed} runs remaining this month`}
                </span>
              </div>

              {/* Exports */}
              <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-400" /> PDF / DOCX Exports
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {report.exportsUsed} / {report.exportsLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getMeterColor(
                      calculatePct(report.exportsUsed, report.exportsLimit)
                    )}`}
                    style={{
                      width: `${calculatePct(report.exportsUsed, report.exportsLimit)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 block">
                  {report.exportsLimit - report.exportsUsed} free exports remaining
                </span>
              </div>

              {/* Data Bank Facts */}
              <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" /> Career Facts Stored
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {report.storageEntriesUsed} / {report.storageEntriesLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getMeterColor(
                      calculatePct(report.storageEntriesUsed, report.storageEntriesLimit)
                    )}`}
                    style={{
                      width: `${calculatePct(report.storageEntriesUsed, report.storageEntriesLimit)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 block">
                  {report.storageEntriesLimit - report.storageEntriesUsed} slots available
                </span>
              </div>

              {/* Active Resumes */}
              <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" /> Saved Resumes
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {report.resumesCount} / {report.resumesLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getMeterColor(
                      calculatePct(report.resumesCount, report.resumesLimit)
                    )}`}
                    style={{
                      width: `${calculatePct(report.resumesCount, report.resumesLimit)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 block">
                  {report.resumesLimit - report.resumesCount} versions open
                </span>
              </div>
            </div>

            {/* BYOK Upgrade Callout */}
            <div className="p-4 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-gray-900/40 border border-blue-900/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  Want 100% Unlimited AI Generations?
                </h4>
                <p className="text-xs text-gray-400 max-w-xl">
                  Connect your personal Google Gemini (Free tier with 15 RPM), Groq (Free tier), or OpenAI API key.
                  Keys are stored encrypted locally and unlock unlimited tailoring runs.
                </p>
              </div>

              <Link
                href="/settings/providers"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
              >
                <Key className="w-3.5 h-3.5" />
                Configure BYOK
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
