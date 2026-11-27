"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { AtsLinter } from "@/lib/editor/atsLinter";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { budgetResumeForOnePageA4 } from "@/lib/editor/onePageA4Budgeter";
import { downloadResumePdf } from "@/lib/export/pdfGenerator";
import { PlainTextSerializer } from "@/lib/export/plainTextSerializer";
import {
  Undo,
  Redo,
  Printer,
  FileDown,
  Download,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Check,
  Share2,
  GitCompare,
  Terminal,
  Copy,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { ShareModal } from "@/components/share/ShareModal";
import { QualityGateModal } from "@/components/export/QualityGateModal";
import { VersionDiffModal } from "@/components/editor/VersionDiffModal";

interface Props {
  store: ResumeDocStore;
  editorState: EditorState;
  resumeId: string;
  resumeTitle?: string;
  autosaveStatus: "saved" | "saving" | "conflict" | "error";
}

export function EditorPreviewPanel({
  store,
  editorState,
  resumeId,
  resumeTitle,
  autosaveStatus,
}: Props) {
  const doc = editorState.doc;
  const [templateId, setTemplateId] = useState<string>(doc.template?.id || "classic-ats");
  const [autoFitStep, setAutoFitStep] = useState<number>(() =>
    AutoFitLadder.recommendedStepForOnePage(doc)
  );
  const [showLintDrawer, setShowLintDrawer] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showQualityGateModal, setShowQualityGateModal] = useState<boolean>(false);
  const [showVersionDiffModal, setShowVersionDiffModal] = useState<boolean>(false);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"visual" | "ats-text">("visual");
  const [copiedAtsText, setCopiedAtsText] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setResumeVersions(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error("Failed to load resume versions:", err);
    }
  }, [resumeId]);

  useEffect(() => {
    if (resumeId) {
      loadVersions();
    }
  }, [resumeId, loadVersions]);

  const lintReport = useMemo(() => AtsLinter.lint(doc), [doc]);
  const fitSettings = useMemo(() => AutoFitLadder.evaluateFit(doc, autoFitStep), [doc, autoFitStep]);
  const plainTextPreview = useMemo(() => PlainTextSerializer.serialize(doc), [doc]);
  const currentPageSize = doc.page?.size === "LETTER" ? "LETTER" : "A4";
  const pageWidthPx = currentPageSize === "A4" ? 794 : 816;
  const pageHeightPx = currentPageSize === "A4" ? 1123 : 1056;
  const paperRef = useRef<HTMLDivElement>(null);
  const [renderedHeightPx, setRenderedHeightPx] = useState<number>(pageHeightPx);

  useEffect(() => {
    const recommended = AutoFitLadder.recommendedStepForOnePage(doc);
    setAutoFitStep((prev) => (recommended > prev ? recommended : prev));
  }, [doc]);

  useEffect(() => {
    const el = paperRef.current;
    if (!el || previewMode !== "visual") return;
    const measure = () => {
      const h = el.scrollHeight;
      setRenderedHeightPx(h);
      if (h > pageHeightPx + 6 && autoFitStep < 8) {
        setAutoFitStep((prev) => (prev < 8 ? prev + 1 : prev));
      }
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => measure());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [doc, templateId, autoFitStep, previewMode, pageHeightPx]);

  const overflowsOnePage = renderedHeightPx > pageHeightPx + 6;
  const handleTrimToFitOnePage = () => {
    const fitted = budgetResumeForOnePageA4(doc);
    store.applyDocumentUpdate(fitted);
    setAutoFitStep(AutoFitLadder.recommendedStepForOnePage(fitted));
  };

  const handleTemplateChange = (newTemplate: string) => {
    setTemplateId(newTemplate);
    store.setTemplateId(newTemplate);
    setAutoFitStep(
      AutoFitLadder.recommendedStepForOnePage({
        ...doc,
        template: { ...doc.template, id: newTemplate },
      })
    );
  };

  const handleExportTxt = async () => {
    setExporting("txt");
    try {
      window.location.href = `/api/v1/resumes/${resumeId}/export/txt`;
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleExportDocx = async () => {
    setExporting("docx");
    try {
      window.location.href = `/api/v1/resumes/${resumeId}/export/docx`;
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleDownloadPdf = () => {
    setExporting("pdf");
    try {
      downloadResumePdf(doc, { resumeTitle });
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };

  const handleQualityGateProceed = (format: "pdf" | "docx") => {
    setShowQualityGateModal(false);
    if (format === "docx") {
      handleExportDocx();
    } else {
      handleDownloadPdf();
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-paper-deep/40">
      <div className="shrink-0 border-b border-rule bg-sheet">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
          <div className="flex items-center overflow-hidden border border-rule">
            <button
              onClick={() => store.undo()}
              disabled={editorState.past.length === 0}
              className="p-1.5 text-ink hover:bg-paper-deep disabled:opacity-30"
              title="Undo"
            >
              <Undo className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
            <span className="h-4 w-px bg-rule" />
            <button
              onClick={() => store.redo()}
              disabled={editorState.future.length === 0}
              className="p-1.5 text-ink hover:bg-paper-deep disabled:opacity-30"
              title="Redo"
            >
              <Redo className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          </div>

          <span className="font-mono text-[10.5px] text-graphite">
            {autosaveStatus === "saving" && "saving"}
            {autosaveStatus === "saved" && "saved"}
            {autosaveStatus === "conflict" && <span className="text-marker-dark">conflict 409</span>}
            {autosaveStatus === "error" && <span className="text-alarm">save failed</span>}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="border border-rule bg-sheet px-1.5 py-1 text-[11.5px] font-medium text-ink"
            >
              <option value="dense-single-page">Dense 1-Page ATS</option>
              <option value="classic-ats">Classic ATS</option>
              <option value="modern-ats">Modern ATS</option>
              <option value="minimal-executive">Minimal Executive</option>
              <option value="technical-scholar">Technical Scholar</option>
              <option value="luxurious-grid">Luxurious Grid (2-Column)</option>
              <option value="compact-engineer">Compact Engineer</option>
            </select>

            <select
              value={currentPageSize}
              onChange={(e) => store.setPageSize(e.target.value as "A4" | "LETTER")}
              className="border border-rule bg-sheet px-1.5 py-1 text-[11.5px] font-medium text-ink"
              title="Page size for PDF & DOCX"
            >
              <option value="A4">A4</option>
              <option value="LETTER">Letter</option>
            </select>

            <button
              onClick={() => setPreviewMode((m) => (m === "visual" ? "ats-text" : "visual"))}
              className={`inline-flex items-center gap-1 border px-1.5 py-1 text-[11.5px] font-medium ${previewMode === "ats-text"
                ? "border-ink bg-ink text-cream"
                : "border-rule bg-sheet text-ink hover:bg-paper-deep"
                }`}
              title="Preview exact plain-text parse order read by ATS systems"
            >
              {previewMode === "ats-text" ? <Eye className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5 text-stamp" />}
              {previewMode === "ats-text" ? "Visual" : "ATS Parse"}
            </button>

            <button
              onClick={() => setAutoFitStep((prev) => (prev < 8 ? prev + 1 : 1))}
              className="inline-flex items-center gap-1 border border-rule bg-sheet px-1.5 py-1 text-[11.5px] font-medium text-ink hover:bg-paper-deep"
              title="Cycle the eight-step one-page fit ladder"
            >
              <Layers className="h-3.5 w-3.5 text-stamp" strokeWidth={1.7} />
              Fit {autoFitStep}/8
            </button>

            <button
              onClick={() => setShowLintDrawer(!showLintDrawer)}
              className={`inline-flex items-center gap-1 border px-1.5 py-1 text-[11.5px] font-medium ${lintReport.score >= 80
                ? "border-press/35 bg-press-soft text-press"
                : "border-marker/40 bg-marker-soft text-marker-dark"
                }`}
              title="ATS readiness report"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
              ATS {lintReport.score}
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-rule px-3 py-1.5">
          <button onClick={() => setShowVersionDiffModal(true)} className="btn btn-sm">
            <GitCompare className="h-3.5 w-3.5" strokeWidth={1.7} />
            Versions
          </button>
          <button onClick={() => setShowQualityGateModal(true)} className="btn btn-sm">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
            Quality gate
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting === "pdf"}
            className="btn btn-sm btn-primary"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
            {exporting === "pdf" ? "Saving PDF…" : "Download PDF"}
          </button>
          <Link href={`/resumes/${resumeId}/print`} target="_blank" className="btn btn-sm">
            <Printer className="h-3.5 w-3.5" strokeWidth={1.7} />
            Print
          </Link>
          <button onClick={() => setShowShareModal(true)} className="btn btn-sm">
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.7} />
            Share
          </button>
          <button onClick={handleExportDocx} disabled={exporting === "docx"} className="btn btn-sm">
            <FileDown className="h-3.5 w-3.5" strokeWidth={1.7} />
            DOCX
          </button>
          <button onClick={handleExportTxt} disabled={exporting === "txt"} className="btn btn-sm">
            <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
            Text
          </button>
        </div>
      </div>

      <ShareModal
        resumeVersionId={doc.versionId || resumeId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        previewDoc={doc}
      />

      <QualityGateModal
        isOpen={showQualityGateModal}
        onClose={() => setShowQualityGateModal(false)}
        resumeId={resumeId}
        currentDoc={doc}
        onProceedExport={handleQualityGateProceed}
      />

      <VersionDiffModal
        isOpen={showVersionDiffModal}
        onClose={() => setShowVersionDiffModal(false)}
        resumeId={resumeId}
        versions={resumeVersions}
        onRestoreVersion={async (vId) => {
          const res = await fetch(`/api/v1/resume-versions/${vId}/restore`, {
            method: "POST",
          });
          if (res.ok) {
            const json = await res.json();
            const restored = json?.data ?? json;
            if (restored?.resumeDocJson) {
              store.setDocument(restored.resumeDocJson);
            }
            await loadVersions();
          }
        }}
        onBranchCreated={loadVersions}
      />

      <div className="flex flex-1 justify-center overflow-y-auto p-4 sm:p-6">
        <div className="relative w-full" style={{ maxWidth: `${pageWidthPx}px` }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-rule bg-sheet px-2.5 py-1.5 text-[11.5px]">
            <span className={overflowsOnePage ? "text-marker-dark font-medium" : "text-press font-medium"}>
              {overflowsOnePage
                ? `Exceeds 1 ${currentPageSize} page (${Math.round((renderedHeightPx / pageHeightPx) * 100)}% height)`
                : `Fits 1 ${currentPageSize} page · ${fitSettings.stepDescription}`}
            </span>
            <div className="flex items-center gap-2">
              {overflowsOnePage && (
                <button
                  type="button"
                  onClick={handleTrimToFitOnePage}
                  className="rounded border border-ink bg-ink px-2 py-0.5 text-[11px] font-semibold text-cream hover:opacity-90"
                >
                  Trim to fit 1 {currentPageSize} page
                </button>
              )}
              {autoFitStep > 1 && (
                <button
                  type="button"
                  onClick={() => setAutoFitStep(1)}
                  className="shrink-0 font-medium text-stamp underline decoration-stamp/30 underline-offset-2"
                >
                  Reset fit
                </button>
              )}
            </div>
          </div>

          {previewMode === "ats-text" ? (
            <div className="border border-rule bg-sheet p-5 shadow-plate space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-ink">
                    Real-Time ATS &amp; Plain-Text Export Simulation
                  </h3>
                  <p className="text-[11.5px] text-graphite">
                    Exact linear text order parsed by recruiter ATS tools and `.txt` export ({plainTextPreview.split(/\s+/).filter(Boolean).length} words · {currentPageSize}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(plainTextPreview);
                    setCopiedAtsText(true);
                    setTimeout(() => setCopiedAtsText(false), 1800);
                  }}
                  className="btn btn-sm"
                >
                  {copiedAtsText ? <Check className="h-3.5 w-3.5 text-press" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedAtsText ? "Copied" : "Copy text"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-ink bg-paper p-4 border border-rule">
                {plainTextPreview}
              </pre>
            </div>
          ) : (
            <div ref={paperRef} className="relative bg-sheet shadow-plate">
              <TemplateRenderer
                doc={doc}
                templateId={templateId}
                fontSizePt={fitSettings.fontSizePt}
                lineHeight={fitSettings.lineHeight}
                sectionGapRem={fitSettings.sectionGapRem}
                marginInches={fitSettings.marginInches}
                onElementClick={(section, id) => store.setActiveLocation(section, id)}
              />
              {overflowsOnePage && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-alarm/60"
                  style={{ top: `${pageHeightPx}px` }}
                >
                  <span className="ml-2 -mt-2.5 inline-block bg-alarm px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-white">
                    End of {currentPageSize} Page 1
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showLintDrawer && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[320px] flex-col overflow-y-auto border-l border-rule bg-sheet p-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h3 className="font-display text-[15px] font-semibold tracking-tight">ATS readiness</h3>
            <button
              onClick={() => setShowLintDrawer(false)}
              className="btn btn-icon text-[15px] leading-none"
              aria-label="Close report"
            >
              ×
            </button>
          </div>

          <div className="mt-3 flex items-baseline gap-2 border border-rule px-3 py-2">
            <span className="font-display text-[30px] font-semibold leading-none tracking-tightest">
              {lintReport.score}
            </span>
            <span className="font-mono text-[10.5px] text-graphite">/ 100 parseable</span>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-[12px] font-semibold">
              Fixes ({lintReport.issues.length})
            </h4>
            {lintReport.issues.length === 0 ? (
              <p className="text-[12px] text-press">No issues found.</p>
            ) : (
              lintReport.issues.map((iss) => (
                <div
                  key={iss.id}
                  className={`border px-2.5 py-2 text-[11.5px] ${iss.severity === "error"
                    ? "border-alarm/35 bg-alarm-soft text-alarm"
                    : "border-marker/40 bg-marker-soft text-marker-dark"
                    }`}
                >
                  <div className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3" strokeWidth={1.8} />
                    {iss.rule}
                  </div>
                  <p className="mt-0.5 leading-relaxed text-ink">{iss.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-1 border-t border-rule pt-3">
            <h4 className="text-[11.5px] font-semibold">Passing</h4>
            <ul className="space-y-1">
              {lintReport.passedChecks.map((chk, idx) => (
                <li key={idx} className="flex items-start gap-1 text-[11.5px] text-press">
                  <Check className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
                  {chk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
