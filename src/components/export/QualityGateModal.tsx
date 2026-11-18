"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  FileText,
  FileCode,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { QualityGateAuditResult } from "@/types/resume";

interface QualityGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  currentDoc?: any;
  onProceedExport: (format: "pdf" | "docx") => void;
}

export function QualityGateModal({
  isOpen,
  onClose,
  resumeId,
  currentDoc,
  onProceedExport,
}: QualityGateModalProps) {
  const [audit, setAudit] = useState<QualityGateAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/quality-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: currentDoc }),
      });
      if (!res.ok) throw new Error("Quality Gate audit failed");
      const data = await res.json();
      setAudit(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to run audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
      setAcknowledgedWarnings(false);
    }
  }, [isOpen, resumeId]);

  if (!isOpen) return null;

  const hasCriticalErrors = (audit?.errors?.length || 0) > 0;
  const hasWarnings = (audit?.warnings?.length || 0) > 0;
  const canExport = audit?.passed || (hasWarnings && !hasCriticalErrors && acknowledgedWarnings);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              hasCriticalErrors
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : hasWarnings
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Pre-Export Quality Gate
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                  PRD 18.7
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Automated multi-point inspection to prevent broken exports and ATS parsing failures.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
              <p className="text-xs">Auditing formatting, dates, ATS text extractability, and link integrity...</p>
            </div>
          ) : !audit ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Click below to run the quality gate audit.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                hasCriticalErrors
                  ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                  : hasWarnings
                  ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                  : "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
              }`}>
                {hasCriticalErrors ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : hasWarnings ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {hasCriticalErrors
                      ? "Export Blocked: Critical Errors Found"
                      : hasWarnings
                      ? "Passed with Quality Warnings"
                      : "All Quality Checks Passed (100% Export-Ready)"}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1">
                    {hasCriticalErrors
                      ? "Please resolve the critical errors listed below before generating your final PDF or DOCX file."
                      : hasWarnings
                      ? "Some minor quality or layout warnings were detected. Review and acknowledge to proceed."
                      : "Document structure, ATS keywords, links, and dates conform strictly to resume standards."}
                  </p>
                </div>
              </div>

              {/* Critical Errors List */}
              {hasCriticalErrors && (() => {
                const errList = audit.criticalErrors || audit.errors || [];
                return (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Critical Errors ({errList.length})
                    </h5>
                    <div className="space-y-1.5">
                      {errList.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-rose-950/30 border border-rose-900/60 rounded-lg text-xs text-rose-200 flex items-start gap-2"
                      >
                        <span className="font-mono text-rose-400 font-bold shrink-0">[{err.rule}]</span>
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

              {/* Warnings List */}
              {hasWarnings && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Quality Warnings ({audit.warnings.length})
                  </h5>
                  <div className="space-y-1.5">
                    {audit.warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-amber-950/30 border border-amber-900/60 rounded-lg text-xs text-amber-200 flex items-start gap-2"
                      >
                        <span className="font-mono text-amber-400 font-bold shrink-0">[{warn.rule}]</span>
                        <span>{warn.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passed Checks Summary */}
              {audit.passedChecks && audit.passedChecks.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Checks ({audit.passedChecks.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {audit.passedChecks.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-[11px] text-emerald-300 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-mono">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Acknowledgment Checkbox */}
              {hasWarnings && !hasCriticalErrors && (
                <label className="flex items-start gap-2.5 p-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-900/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={acknowledgedWarnings}
                    onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
                    className="mt-0.5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-300">
                    I acknowledge these quality warnings and want to proceed with document export anyway.
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={runAudit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-run Audit
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onProceedExport("docx")}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg font-semibold border border-gray-700 transition-colors shadow-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              Export DOCX
            </button>
            <button
              onClick={() => onProceedExport("pdf")}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-semibold transition-all shadow"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
