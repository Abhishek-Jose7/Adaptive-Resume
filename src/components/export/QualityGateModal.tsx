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
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-rule rounded-lg max-w-2xl w-full overflow-hidden shadow-plate flex flex-col max-h-[90vh] text-ink">
        {/* Header */}
        <div className="p-4 bg-sheet border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              hasCriticalErrors
                ? "bg-alarm-soft border-alarm/30 text-alarm"
                : hasWarnings
                ? "bg-marker-soft border-marker/30 text-marker-dark"
                : "bg-press-soft border-press/30 text-press"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Pre-Export Quality Gate
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-stamp-soft text-stamp border border-stamp/30 rounded-full">
                  PRD 18.7
                </span>
              </h3>
              <p className="text-xs text-graphite">
                Automated multi-point inspection to prevent broken exports and ATS parsing failures.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-graphite hover:text-ink p-1 rounded-lg hover:bg-paper-deep"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center text-graphite space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
              <p className="text-xs">Auditing formatting, dates, ATS text extractability, and link integrity...</p>
            </div>
          ) : !audit ? (
            <div className="text-center py-12 text-graphite text-xs">
              Click below to run the quality gate audit.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Status Banner */}
              <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                hasCriticalErrors
                  ? "bg-alarm-soft border-alarm/80 text-alarm"
                  : hasWarnings
                  ? "bg-marker-soft border-marker/80 text-marker-dark"
                  : "bg-press-soft border-press/80 text-press"
              }`}>
                {hasCriticalErrors ? (
                  <XCircle className="w-5 h-5 text-alarm shrink-0 mt-0.5" />
                ) : hasWarnings ? (
                  <AlertTriangle className="w-5 h-5 text-marker-dark shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-press shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold normal-case tracking-normal">
                    {hasCriticalErrors
                      ? "Export Blocked: Critical Errors Found"
                      : hasWarnings
                      ? "Passed with Quality Warnings"
                      : "All Quality Checks Passed (100% Export-Ready)"}
                  </h4>
                  <p className="text-xs text-ink mt-1">
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
                    <h5 className="text-xs font-bold text-alarm normal-case tracking-normal flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Critical Errors ({errList.length})
                    </h5>
                    <div className="space-y-1.5">
                      {errList.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-alarm-soft border border-alarm/60 rounded-lg text-xs text-alarm flex items-start gap-2"
                      >
                        <span className="font-mono text-alarm font-bold shrink-0">[{err.rule}]</span>
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
                  <h5 className="text-xs font-bold text-marker-dark normal-case tracking-normal flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Quality Warnings ({audit.warnings.length})
                  </h5>
                  <div className="space-y-1.5">
                    {audit.warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-marker-soft border border-marker/60 rounded-lg text-xs text-marker-dark flex items-start gap-2"
                      >
                        <span className="font-mono text-marker-dark font-bold shrink-0">[{warn.rule}]</span>
                        <span>{warn.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passed Checks Summary */}
              {audit.passedChecks && audit.passedChecks.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-press normal-case tracking-normal flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Checks ({audit.passedChecks.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {audit.passedChecks.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-press-soft border border-press/40 rounded-lg text-[11px] text-press flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-press shrink-0" />
                        <span className="font-mono">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Acknowledgment Checkbox */}
              {hasWarnings && !hasCriticalErrors && (
                <label className="flex items-start gap-2.5 p-3 bg-sheet border border-rule rounded-lg cursor-pointer hover:bg-sheet/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={acknowledgedWarnings}
                    onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
                    className="mt-0.5 rounded bg-paper-deep border-rule text-stamp focus:ring-stamp"
                  />
                  <span className="text-xs text-ink">
                    I acknowledge these quality warnings and want to proceed with document export anyway.
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-sheet border-t border-rule flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={runAudit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-run Audit
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onProceedExport("docx")}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-paper-deep hover:bg-paper-deep disabled:opacity-40 text-ink rounded-lg font-semibold border border-rule transition-colors shadow-none"
            >
              <FileCode className="w-3.5 h-3.5 text-stamp" />
              Export DOCX
            </button>
            <button
              onClick={() => onProceedExport("pdf")}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-stamp hover:bg-stamp-dark disabled:opacity-40 text-white rounded-lg font-semibold transition-all shadow"
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
