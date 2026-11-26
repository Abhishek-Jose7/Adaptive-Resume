"use client";

import React, { useState } from "react";
import { ResumeBulletDoc } from "@/types/resume";
import { ResumeDocStore } from "@/lib/editor/resumeDocStore";
import {
  Sparkles,
  ShieldCheck,
  Database,
  ArrowUpFromLine,
  Eye,
  Check,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export interface VaultBulletProvenance {
  id: string;
  entryId: string;
  entryTitle: string;
  entryType: string;
  organization: string | null;
  text: string;
  verificationStatus: string;
  rowVersion: number;
  facts: Array<{
    id: string;
    factType: string;
    factKey: string;
    valueText: string;
    unit: string | null;
    metricKind: string | null;
    verificationStatus: string;
  }>;
}

export interface BulletAiRewriteProposal {
  runId?: string;
  bulletId: string;
  originalText: string;
  rewrittenText: string;
  diffChunks?: Array<{ value: string; added?: boolean; removed?: boolean }>;
  validatorStatus: "passed" | "rejected" | "fallback_to_source";
  validationNotes?: string[];
  sourceBulletIds?: string[];
  sourceFactIds?: string[];
  suggestedMetricQuestion?: string | null;
}

export interface ResumeProvenancePayload {
  resumeId: string;
  jobId: string | null;
  bulletsById: Record<string, VaultBulletProvenance>;
  factsById: Record<
    string,
    {
      id: string;
      factType: string;
      factKey: string;
      valueText: string;
      unit: string | null;
      metricKind: string | null;
      verificationStatus: string;
    }
  >;
  aiRewritesByBulletId: Record<string, BulletAiRewriteProposal>;
}

interface BulletAssistantControlsProps {
  resumeId?: string;
  store: ResumeDocStore;
  sectionType: "experience" | "projects";
  parentId: string;
  entryTitle?: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  bullet: ResumeBulletDoc;
  provenanceData: ResumeProvenancePayload | null;
  onProvenanceRefresh: () => Promise<void>;
}

export function BulletAssistantControls({
  resumeId,
  store,
  sectionType,
  parentId,
  entryTitle,
  organization,
  location,
  startDate,
  endDate,
  isCurrent,
  bullet,
  provenanceData,
  onProvenanceRefresh,
}: BulletAssistantControlsProps) {
  const [showProvenance, setShowProvenance] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [localRewrite, setLocalRewrite] = useState<BulletAiRewriteProposal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const primarySourceBulletId = bullet.sourceBulletIds?.[0] || bullet.id;
  const vaultBullet = provenanceData?.bulletsById?.[primarySourceBulletId] || null;

  const preloadedRewrite =
    provenanceData?.aiRewritesByBulletId?.[primarySourceBulletId] ||
    provenanceData?.aiRewritesByBulletId?.[bullet.id] ||
    null;
  const activeRewrite = localRewrite || preloadedRewrite;

  const citedFacts = [
    ...(vaultBullet?.facts || []),
    ...(bullet.sourceFactIds || [])
      .map((fid) => provenanceData?.factsById?.[fid])
      .filter((f): f is NonNullable<typeof f> => Boolean(f)),
  ].filter((fact, idx, arr) => arr.findIndex((x) => x.id === fact.id) === idx);

  const trimmedBullet = bullet.text.trim();
  const isModifiedFromVault = Boolean(
    trimmedBullet &&
      ((vaultBullet && trimmedBullet !== vaultBullet.text.trim()) ||
        (!vaultBullet && bullet.provenance === "manual"))
  );

  const handleRequestRewrite = async () => {
    if (!resumeId || !trimmedBullet) return;
    if (activeRewrite && !showCompare) {
      setShowCompare(true);
      return;
    }

    setAiLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/bullets/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulletId: bullet.id,
          bulletText: bullet.text,
          sourceBulletIds: bullet.sourceBulletIds,
          sectionType,
          entryTitle,
          organization,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to generate rewrite");
      }
      const payload = json?.data ?? json;
      setLocalRewrite(payload);
      setShowCompare(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Could not generate AI rewrite");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyRewrite = (textToApply: string, isOriginal = false) => {
    store.updateBulletWithProvenance(sectionType, parentId, bullet.id, {
      text: textToApply,
      provenance: isOriginal ? (vaultBullet ? "bank" : "manual") : "ai-rewrite",
      sourceBulletIds:
        activeRewrite?.sourceBulletIds?.length
          ? activeRewrite.sourceBulletIds
          : bullet.sourceBulletIds,
      sourceFactIds:
        activeRewrite?.sourceFactIds?.length
          ? activeRewrite.sourceFactIds
          : bullet.sourceFactIds,
      validatorStatus: isOriginal ? "not_applicable" : "passed",
    });
  };

  const handleSyncToVault = async () => {
    if (!resumeId || !trimmedBullet) return;
    setSyncLoading(true);
    setErrorMsg(null);
    setSyncToast(null);
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/sync-to-vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulletId: bullet.id,
          text: trimmedBullet,
          sourceBulletIds: vaultBullet ? [vaultBullet.id] : bullet.sourceBulletIds,
          sectionType,
          entryTitle,
          organization,
          location,
          startDate,
          endDate,
          isCurrent,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to save back to Career Vault");
      }
      const result = json?.data ?? json;
      if (result?.vaultBulletId) {
        store.updateBulletWithProvenance(sectionType, parentId, bullet.id, {
          sourceBulletIds: [result.vaultBulletId],
          provenance: bullet.provenance === "manual" ? "bank" : bullet.provenance,
        });
      }
      await onProvenanceRefresh();
      setSyncToast(
        result.action === "created"
          ? `Added to Career Vault (${result.extractedFactsCount || 0} metrics indexed)`
          : `Career Vault updated (${result.extractedFactsCount || 0} metrics indexed)`
      );
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sync to Career Vault");
    } finally {
      setSyncLoading(false);
    }
  };

  if (!resumeId) return null;

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
            bullet.provenance === "ai-rewrite"
              ? "border-stamp/35 bg-stamp-soft text-stamp"
              : vaultBullet
              ? "border-press/30 bg-press-soft text-press"
              : "border-rule bg-paper-alt text-graphite"
          }`}
        >
          {bullet.provenance === "ai-rewrite"
            ? "AI Tailored"
            : vaultBullet
            ? "Career Vault"
            : "Manual"}
        </span>

        {(vaultBullet || citedFacts.length > 0) && (
          <button
            type="button"
            onClick={() => setShowProvenance((v) => !v)}
            className="inline-flex items-center gap-1 rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[10.5px] font-medium text-ink hover:border-stamp hover:text-stamp"
          >
            <Eye className="h-3 w-3" />
            {showProvenance ? "Hide source" : `Provenance${citedFacts.length > 0 ? ` (${citedFacts.length} facts)` : ""}`}
          </button>
        )}

        {trimmedBullet && (
          <button
            type="button"
            onClick={handleRequestRewrite}
            disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[10.5px] font-medium text-stamp hover:border-stamp hover:bg-stamp-soft disabled:opacity-50"
          >
            {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {activeRewrite
              ? showCompare
                ? "Hide AI compare"
                : "Compare AI rewrite"
              : "AI rewrite"}
          </button>
        )}

        {isModifiedFromVault && (
          <button
            type="button"
            onClick={handleSyncToVault}
            disabled={syncLoading}
            className="inline-flex items-center gap-1 rounded border border-press/40 bg-press-soft px-1.5 py-0.5 text-[10.5px] font-medium text-press hover:bg-press hover:text-white disabled:opacity-50"
            title="Backport this updated bullet and its metrics to your permanent Career Vault"
          >
            {syncLoading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpFromLine className="h-3 w-3" />
            )}
            {vaultBullet ? "Save improvement to Vault" : "Save bullet to Vault"}
          </button>
        )}

        {syncToast && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-press">
            <Check className="h-3 w-3" /> {syncToast}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 rounded border border-alarm/30 bg-alarm-soft px-2 py-1 text-[11px] text-alarm">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inline Provenance Inspection Panel */}
      {showProvenance && (
        <div className="rounded border border-rule bg-paper p-2.5 text-[11px] space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Database className="h-3 w-3 text-press" />
              {vaultBullet
                ? `${vaultBullet.entryTitle}${vaultBullet.organization ? ` · ${vaultBullet.organization}` : ""}`
                : "Linked Evidence"}
            </span>
            {vaultBullet && (
              <span className="font-mono text-[10px] text-press uppercase">
                {vaultBullet.verificationStatus}
              </span>
            )}
          </div>
          {vaultBullet && (
            <p className="rounded bg-white border border-rule px-2 py-1.5 text-graphite leading-relaxed">
              <strong className="text-ink">Original Vault Fact:</strong> {vaultBullet.text}
            </p>
          )}
          {citedFacts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {citedFacts.map((fact) => (
                <span
                  key={fact.id}
                  className="inline-flex items-center gap-1 rounded border border-press/30 bg-press-soft px-1.5 py-0.5 font-mono text-[10px] text-press"
                >
                  {fact.factType}: {fact.valueText}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side AI Rewrite Toggle Panel */}
      {showCompare && activeRewrite && (
        <div className="rounded border border-stamp/40 bg-stamp-soft/50 p-2.5 text-[11px] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-press" />
              Side-by-Side Truth-Bound Rewrite
            </span>
            <span className="font-mono text-[10px] text-press">
              {activeRewrite.validatorStatus === "passed"
                ? "verified facts only"
                : "retained safe original"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded border border-rule bg-white p-2 space-y-1">
              <span className="block font-mono text-[10px] uppercase text-graphite">
                Original / Source
              </span>
              <p className="text-ink leading-relaxed">
                {vaultBullet?.text || activeRewrite.originalText}
              </p>
            </div>

            <div className="rounded border border-stamp/40 bg-white p-2 space-y-1">
              <span className="block font-mono text-[10px] uppercase text-stamp">
                AI Tailored Draft
              </span>
              <p className="text-ink leading-relaxed">
                {activeRewrite.diffChunks && activeRewrite.diffChunks.length > 0
                  ? activeRewrite.diffChunks.map((chunk, i) =>
                      chunk.added ? (
                        <ins key={i} className="bg-press-soft text-press no-underline font-medium px-0.5">
                          {chunk.value}
                        </ins>
                      ) : chunk.removed ? (
                        <del key={i} className="bg-alarm-soft text-alarm line-through opacity-75 px-0.5">
                          {chunk.value}
                        </del>
                      ) : (
                        <span key={i}>{chunk.value}</span>
                      )
                    )
                  : activeRewrite.rewrittenText}
              </p>
            </div>
          </div>

          {activeRewrite.suggestedMetricQuestion && (
            <p className="text-[10.5px] italic text-marker-dark">
              Optional metric prompt: {activeRewrite.suggestedMetricQuestion}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleApplyRewrite(activeRewrite.rewrittenText, false)}
              disabled={bullet.text.trim() === activeRewrite.rewrittenText.trim()}
              className="inline-flex items-center gap-1 rounded bg-press px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              <Check className="h-3 w-3" /> Use AI rewrite
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyRewrite(vaultBullet?.text || activeRewrite.originalText, true)
              }
              className="inline-flex items-center gap-1 rounded border border-rule bg-white px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-paper"
            >
              <RotateCcw className="h-3 w-3" /> Restore source
            </button>
            <button
              type="button"
              onClick={handleRequestRewrite}
              disabled={aiLoading}
              className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-medium text-stamp hover:underline"
            >
              <RefreshCw className={`h-3 w-3 ${aiLoading ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
