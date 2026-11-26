"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Key } from "lucide-react";
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

  const pct = (used: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const meterColor = (p: number) =>
    p >= 90 ? "var(--alarm)" : p >= 70 ? "var(--marker)" : "var(--stamp)";

  if (loading) {
    return (
      <div className="panel flex items-center gap-2 px-5 py-6 text-[13px] text-graphite">
        <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
        Reading this month&apos;s usage
      </div>
    );
  }

  if (!report) {
    return (
      <div className="panel px-5 py-6">
        <p className="text-[13px] text-graphite">The usage report could not be read.</p>
        <button onClick={fetchReport} className="btn btn-sm mt-3">
          Try again
        </button>
      </div>
    );
  }

  const rows = [
    {
      label: "AI tailoring runs",
      used: report.aiGenerationsUsed,
      limit: report.hasCustomApiKey ? 0 : report.aiGenerationsLimit,
      note: report.hasCustomApiKey
        ? "Unlimited on your own key"
        : `${report.aiGenerationsLimit - report.aiGenerationsUsed} left this month`,
    },
    {
      label: "DOCX & TXT downloads (server-tracked)",
      used: report.exportsUsed,
      limit: report.exportsLimit,
      note: `${Math.max(0, report.exportsLimit - report.exportsUsed)} left this month · browser print/PDF is unlimited`,
    },
    {
      label: "Career facts stored",
      used: report.storageEntriesUsed,
      limit: report.storageEntriesLimit,
      note: `${report.storageEntriesLimit - report.storageEntriesUsed} slots open`,
    },
    {
      label: "Saved resumes",
      used: report.resumesCount,
      limit: report.resumesLimit,
      note: `${report.resumesLimit - report.resumesCount} open`,
    },
  ];

  return (
    <div className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[11px] text-graphite">{report.monthlyPeriod}</span>
          <span className="text-[12px] text-graphite">platform fee</span>
          <span className="font-display text-[18px] font-semibold tracking-tight">$0.00</span>
          <span className="font-mono text-[11px] text-graphite">
            · {report.aiTokensConsumed.toLocaleString()} tokens logged
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="border border-rule px-1.5 py-0.5 font-mono text-[10.5px] text-graphite">
            {report.hasCustomApiKey ? `byok · ${report.activeProvider}` : "built-in engine"}
          </span>
          <button onClick={fetchReport} className="btn btn-icon" aria-label="Refresh usage">
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <table className="w-full text-[13px]">
        <tbody className="divide-y divide-rule">
          {rows.map((row) => {
            const p = row.limit > 0 ? pct(row.used, row.limit) : 0;
            return (
              <tr key={row.label}>
                <td className="px-4 py-3 sm:px-5">
                  <div className="font-medium">{row.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-graphite">{row.note}</div>
                </td>
                <td className="hidden w-[36%] px-2 py-3 sm:table-cell">
                  <div className="meter">
                    <span
                      style={{
                        width: row.limit > 0 ? `${p}%` : "100%",
                        backgroundColor: meterColor(p),
                      }}
                    />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11.5px] text-graphite sm:px-5">
                  {row.used} / {row.limit > 0 ? row.limit : "∞"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!report.hasCustomApiKey && (
        <div className="flex flex-col gap-2 border-t border-rule bg-paper-alt px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="max-w-[58ch] text-[12px] leading-relaxed text-graphite">
            The generation ceiling is the only metered part. Your own Gemini or Groq key removes it.
          </p>
          <Link href="/settings/providers" className="btn btn-sm shrink-0">
            <Key className="h-3.5 w-3.5" strokeWidth={1.8} />
            Add a key
          </Link>
        </div>
      )}
    </div>
  );
}
