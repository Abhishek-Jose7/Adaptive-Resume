"use client";

import React, { useState } from "react";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { AtsLinter } from "@/lib/editor/atsLinter";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
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
} from "lucide-react";
import Link from "next/link";
import { ShareModal } from "@/components/share/ShareModal";
import { QualityGateModal } from "@/components/export/QualityGateModal";
import { VersionDiffModal } from "@/components/editor/VersionDiffModal";

interface Props {
  store: ResumeDocStore;
  editorState: EditorState;
  resumeId: string;
  autosaveStatus: "saved" | "saving" | "conflict" | "error";
}

export function EditorPreviewPanel({
  store,
  editorState,
  resumeId,
  autosaveStatus,
}: Props) {
  const doc = editorState.doc;
  const [templateId, setTemplateId] = useState<string>(doc.template?.id || "classic-ats");
  const [autoFitStep, setAutoFitStep] = useState<number>(1);
  const [showLintDrawer, setShowLintDrawer] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showQualityGateModal, setShowQualityGateModal] = useState<boolean>(false);
  const [showVersionDiffModal, setShowVersionDiffModal] = useState<boolean>(false);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setResumeVersions(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load resume versions:", err);
    }
  };

  React.useEffect(() => {
    if (resumeId) {
      loadVersions();
    }
  }, [resumeId]);

  const lintReport = AtsLinter.lint(doc);
  const fitSettings = AutoFitLadder.evaluateFit(doc, autoFitStep);

  const handleTemplateChange = (newTemplate: string) => {
    setTemplateId(newTemplate);
    store.updateProfile({});
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

  const handleQualityGateProceed = (format: "pdf" | "docx") => {
    setShowQualityGateModal(false);
    if (format === "docx") {
      handleExportDocx();
    } else {
      window.open(`/resumes/${resumeId}/print`, "_blank");
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
              <option value="classic-ats">Classic ATS</option>
              <option value="modern-ats">Modern ATS</option>
              <option value="minimal-executive">Minimal Executive</option>
              <option value="technical-scholar">Technical Scholar</option>
            </select>

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
              className={`inline-flex items-center gap-1 border px-1.5 py-1 text-[11.5px] font-medium ${
                lintReport.score >= 80
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
          <Link href={`/resumes/${resumeId}/print`} target="_blank" className="btn btn-sm btn-primary">
            <Printer className="h-3.5 w-3.5" strokeWidth={1.7} />
            Print or PDF
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
          const res = await fetch(`/api/v1/resumes/${resumeId}`);
          if (res.ok) {
            const data = await res.json();
            const serverDoc = data.latestVersion?.resumeDocJson || data.documentJson;
            if (serverDoc) store.updateProfile(serverDoc.contact || {});
          }
        }}
        onBranchCreated={loadVersions}
      />

      <div className="flex flex-1 justify-center overflow-y-auto p-4 sm:p-6">
        <div className="relative w-full max-w-[816px]">
          {autoFitStep > 1 && (
            <div className="mb-3 flex items-center justify-between gap-3 border border-stamp/30 bg-stamp-soft px-2.5 py-1.5 text-[11.5px] text-stamp">
              <span>{fitSettings.stepDescription}</span>
              <button
                onClick={() => setAutoFitStep(1)}
                className="shrink-0 font-medium underline decoration-stamp/30 underline-offset-2"
              >
                Reset
              </button>
            </div>
          )}

          {fitSettings.overflowWarning && (
            <div className="mb-3 border border-marker/40 bg-marker-soft px-2.5 py-1.5 text-[11.5px] text-marker-dark">
              {fitSettings.overflowWarning}
            </div>
          )}

          <div className="bg-sheet shadow-plate">
            <TemplateRenderer
              doc={doc}
              templateId={templateId}
              fontSizePt={fitSettings.fontSizePt}
              lineHeight={fitSettings.lineHeight}
              sectionGapRem={fitSettings.sectionGapRem}
              marginInches={fitSettings.marginInches}
              onElementClick={(section, id) => store.setActiveLocation(section, id)}
            />
          </div>
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
                  className={`border px-2.5 py-2 text-[11.5px] ${
                    iss.severity === "error"
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
