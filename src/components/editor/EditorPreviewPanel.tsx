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
  ChevronDown,
  Sparkles,
  ExternalLink,
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
    // Persist template choice to doc
    store.updateProfile({}); // triggers pushState
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
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Action & Formatting Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Undo / Redo & Save status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md overflow-hidden bg-gray-50">
            <button
              onClick={() => store.undo()}
              disabled={editorState.past.length === 0}
              className="p-1.5 hover:bg-gray-200 disabled:opacity-30 text-gray-700"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300" />
            <button
              onClick={() => store.redo()}
              disabled={editorState.future.length === 0}
              className="p-1.5 hover:bg-gray-200 disabled:opacity-30 text-gray-700"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-gray-500">
            {autosaveStatus === "saving" && "Saving changes..."}
            {autosaveStatus === "saved" && "All changes saved"}
            {autosaveStatus === "conflict" && (
              <span className="text-amber-600 font-semibold">Sync Conflict (409)</span>
            )}
            {autosaveStatus === "error" && (
              <span className="text-red-600 font-semibold">Error saving</span>
            )}
          </span>
        </div>

        {/* Template Selector & Auto-Fit Ladder */}
        <div className="flex items-center gap-2">
          {/* Template Choice */}
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="text-xs border rounded-md px-2 py-1 bg-white font-medium text-gray-700"
          >
            <option value="classic-ats">Classic ATS (Serif)</option>
            <option value="modern-ats">Modern ATS (Sans)</option>
            <option value="minimal-executive">Minimal Executive</option>
            <option value="technical-scholar">Technical Scholar</option>
          </select>

          {/* Auto-Fit Ladder Controls */}
          <button
            onClick={() => setAutoFitStep((prev) => (prev < 8 ? prev + 1 : 1))}
            className="flex items-center gap-1 text-xs border rounded-md px-2.5 py-1 bg-white hover:bg-gray-50 text-indigo-700 font-semibold shadow-xs"
            title="Cycles through deterministic 8-step one-page fit ladder (Section 10.6)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Auto-Fit: Step {autoFitStep}/8
          </button>

          {/* ATS Lint Badge Button */}
          <button
            onClick={() => setShowLintDrawer(!showLintDrawer)}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              lintReport.score >= 80
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            ATS Score: {lintReport.score}
          </button>
        </div>

        {/* Export & Review Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowVersionDiffModal(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md shadow-xs transition-colors"
            title="Inspect version differences, bullet provenance, and branch history (PRD 18.5)"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" /> Version Diff (18.5)
          </button>

          <button
            onClick={() => setShowQualityGateModal(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-md shadow-xs transition-colors"
            title="Pre-export inspection for unsupported claims, formatting defects, and ATS compatibility (PRD 18.7)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Quality Gate (18.7)
          </button>

          <Link
            href={`/resumes/${resumeId}/print`}
            target="_blank"
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Link>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border hover:bg-gray-50 text-gray-700 font-medium rounded-md shadow-xs"
            title="Create expiring share link"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" /> Share
          </button>

          <button
            onClick={handleExportDocx}
            disabled={exporting === "docx"}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border hover:bg-gray-50 text-gray-700 font-medium rounded-md shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" /> DOCX
          </button>

          <button
            onClick={handleExportTxt}
            disabled={exporting === "txt"}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border hover:bg-gray-50 text-gray-700 font-medium rounded-md shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" /> TXT
          </button>
        </div>
      </div>

      <ShareModal
        resumeVersionId={doc.versionId || resumeId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Pre-Export Quality Gate Modal (PRD 18.7) */}
      <QualityGateModal
        isOpen={showQualityGateModal}
        onClose={() => setShowQualityGateModal(false)}
        resumeId={resumeId}
        currentDoc={doc}
        onProceedExport={handleQualityGateProceed}
      />

      {/* Version Diff Inspector Modal (PRD 18.5) */}
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

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className="w-full max-w-[816px] relative">
          {/* Fit Step Alert */}
          {autoFitStep > 1 && (
            <div className="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900 flex justify-between items-center">
              <span>{fitSettings.stepDescription}</span>
              <button
                onClick={() => setAutoFitStep(1)}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Reset Spacing
              </button>
            </div>
          )}

          {fitSettings.overflowWarning && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              {fitSettings.overflowWarning}
            </div>
          )}

          {/* Render the Active Resume Template with two-way click-to-edit sync */}
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

      {/* ATS Lint Drawer */}
      {showLintDrawer && (
        <div className="absolute right-0 top-12 bottom-0 w-80 bg-white border-l shadow-xl z-20 flex flex-col p-4 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" /> ATS Readiness Report
            </h3>
            <button
              onClick={() => setShowLintDrawer(false)}
              className="text-gray-400 hover:text-gray-600 font-bold text-sm"
            >
              ×
            </button>
          </div>

          <div className="text-center py-2 bg-gray-50 rounded-lg border">
            <span className="text-3xl font-extrabold text-indigo-600">{lintReport.score}</span>
            <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">
              ATS Compatibility Rating
            </span>
          </div>

          {/* Issues */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase">
              Actionable Fixes ({lintReport.issues.length})
            </h4>
            {lintReport.issues.length === 0 ? (
              <p className="text-xs text-green-700 font-medium">All ATS checks passed cleanly!</p>
            ) : (
              lintReport.issues.map((iss) => (
                <div
                  key={iss.id}
                  className={`p-2.5 rounded border text-xs space-y-1 ${
                    iss.severity === "error"
                      ? "bg-red-50/50 border-red-200 text-red-900"
                      : "bg-amber-50/50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {iss.rule}
                  </div>
                  <p className="text-[11px] text-gray-700">{iss.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Passed Checks */}
          <div className="space-y-1 pt-2 border-t text-xs">
            <h4 className="font-bold text-gray-700 uppercase text-[11px]">Passed Checks</h4>
            <ul className="space-y-1 text-gray-600 text-[11px]">
              {lintReport.passedChecks.map((chk, idx) => (
                <li key={idx} className="flex items-center gap-1 text-green-700">
                  <Check className="w-3 h-3 text-green-600" /> {chk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
