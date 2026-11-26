"use client";

import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  ShieldCheck,
  Star,
  RefreshCw,
  Sliders,
  ExternalLink,
  Layers,
} from "lucide-react";
import { ProjectRecommendation } from "@/types/job";
import { ProjectMaturityLevel } from "@/types/bank";

interface ProjectRecommendationPanelProps {
  jobId: string;
  onSelectedProjectsChange?: (selectedIds: string[]) => void;
}

export function ProjectRecommendationPanel({
  jobId,
  onSelectedProjectsChange,
}: ProjectRecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingMetadataEntryId, setEditingMetadataEntryId] = useState<string | null>(null);

  // Edit metadata form state
  const [editMaturity, setEditMaturity] = useState<ProjectMaturityLevel>("functional_prototype");
  const [editContribution, setEditContribution] = useState("");
  const [editGaps, setEditGaps] = useState("");
  const [editLimitations, setEditLimitations] = useState("");
  const [editProductionReady, setEditProductionReady] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/project-recommendations`);
      if (res.ok) {
        const data = await res.json();
        const items: ProjectRecommendation[] = Array.isArray(data) ? data : data.items || [];
        setRecommendations(items);
        // Only reflect explicitly pre-selected projects; never force-select unapproved projects
        const initial = new Set<string>();
        items.forEach((p: ProjectRecommendation) => {
          if (p.selected) {
            const id = p.projectId || p.entryId;
            if (id) initial.add(id);
          }
        });
        setSelectedIds(initial);
        if (onSelectedProjectsChange && initial.size > 0) {
          onSelectedProjectsChange(Array.from(initial));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchRecommendations();
    }
  }, [jobId]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    if (onSelectedProjectsChange) {
      onSelectedProjectsChange(Array.from(next));
    }
  };

  const handleOpenEditMetadata = (rec: ProjectRecommendation) => {
    setEditingMetadataEntryId(rec.projectId || rec.entryId || null);
    setEditMaturity((rec.maturityLevel || "functional_prototype") as ProjectMaturityLevel);
    setEditContribution(rec.metadata?.actualContribution || "");
    setEditGaps(rec.metadata?.implementationGaps || "");
    setEditLimitations(rec.metadata?.limitations || "");
    setEditProductionReady(rec.metadata?.isProductionReady || false);
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetadataEntryId) return;
    setSavingMetadata(true);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/project-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: editingMetadataEntryId,
          maturityLevel: editMaturity,
          actualContribution: editContribution.trim() || undefined,
          implementationGaps: editGaps.trim() || undefined,
          limitations: editLimitations.trim() || undefined,
          isProductionReady: editProductionReady,
        }),
      });

      if (res.ok) {
        await fetchRecommendations();
        setEditingMetadataEntryId(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update project metadata");
    } finally {
      setSavingMetadata(false);
    }
  };

  const getMaturityBadge = (maturity: ProjectMaturityLevel) => {
    switch (maturity) {
      case "deployed":
      case "completed":
        return "bg-press-soft border-press text-press";
      case "functional_prototype":
        return "bg-stamp-soft border-stamp text-stamp";
      case "partially_implemented":
      case "in_development":
        return "bg-marker-soft border-marker text-marker-dark";
      case "idea":
      default:
        return "bg-paper-deep border-rule text-graphite";
    }
  };

  return (
    <div className="bg-paper border border-rule rounded-lg overflow-hidden shadow-plate text-ink">
      {/* Header */}
      <div className="p-4 bg-sheet border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-stamp-soft border border-stamp/30 rounded-lg text-stamp">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              JD-Targeted Project Recommendations
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-stamp-soft text-stamp border border-stamp/30 rounded-full">
                PRD 18.11
              </span>
            </h3>
            <p className="text-xs text-graphite">
              Ranked by job relevance. Honest maturity levels and explicit user approval required.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="p-1.5 text-graphite hover:text-ink rounded-lg hover:bg-paper-deep transition-colors self-start sm:self-auto"
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Honest Scope Callout */}
      <div className="px-5 py-2.5 bg-sheet/40 border-b border-rule/80 flex items-center justify-between text-xs text-graphite">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-press shrink-0" />
          <span>
            Non-production and hackathon projects are represented honestly without inflated claims.
          </span>
        </div>
        <span className="text-[11px] font-mono text-stamp">
          {selectedIds.size} of {recommendations.length} selected for resume
        </span>
      </div>

      {/* Content list */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-graphite space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
            <p className="text-xs">Analyzing job description requirements against candidate projects...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 text-graphite text-xs space-y-2">
            <FolderGit2 className="w-8 h-8 text-graphite mx-auto" />
            <p>No candidate projects found in Data Bank or JD analysis not yet triggered.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const pId = rec.projectId || rec.entryId || "";
              const isSelected = selectedIds.has(pId);
              const supportedReqs = rec.supportedJobRequirements || rec.supportedRequirements || [];
              return (
                <div
                  key={pId}
                  className={`p-4 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-sheet/90 border-stamp/60 ring-1 ring-stamp/20"
                      : "bg-sheet/30 border-rule hover:border-rule"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(pId)}
                        className="mt-1 rounded bg-paper-deep border-rule text-stamp focus:ring-stamp cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-ink">{rec.projectTitle || rec.title}</h4>
                          <span className={`text-[10px] normal-case font-mono px-2 py-0.5 rounded border ${getMaturityBadge(rec.maturityLevel as ProjectMaturityLevel)}`}>
                            {rec.maturityLevel.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-paper-deep text-ink font-mono">
                            Match Score: {rec.relevanceScore}%
                          </span>
                        </div>

                        <p className="text-xs text-stamp mt-1 font-medium">
                          {rec.relevanceExplanation || rec.relevanceRationale}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEditMetadata(rec)}
                      className="p-1.5 text-graphite hover:text-ink rounded hover:bg-paper-deep transition-colors"
                      title="Edit project maturity & limitations"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Skills & Requirements badges */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-rule/60 pt-3">
                    <div>
                      <span className="text-[10px] normal-case text-graphite font-bold block mb-1">
                        Demonstrated Skills
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rec.demonstratedSkills.map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-paper-deep text-ink text-[10px] font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] normal-case text-graphite font-bold block mb-1">
                        Supported JD Qualifications
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {supportedReqs.map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-stamp-soft border border-stamp/40 text-stamp text-[10px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Implementation scope and limitations */}
                  {(rec.metadata?.implementationGaps || rec.metadata?.limitations) && (
                    <div className="mt-2.5 p-2 bg-paper rounded border border-rule/80 text-[11px] text-graphite">
                      <span className="font-semibold text-marker-dark">Known Scope / Gaps: </span>
                      {rec.metadata.implementationGaps || rec.metadata.limitations}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Project Maturity Modal */}
      {editingMetadataEntryId && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-sheet border border-rule rounded-lg max-w-lg w-full p-5 space-y-4 shadow-plate text-ink">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-stamp" />
                Edit Project Maturity &amp; Scope
              </h4>
              <button
                onClick={() => setEditingMetadataEntryId(null)}
                className="text-graphite hover:text-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-3 text-xs">
              <div>
                <label className="block text-graphite mb-1 font-medium">Project Maturity Level</label>
                <select
                  value={editMaturity}
                  onChange={(e) => setEditMaturity(e.target.value as ProjectMaturityLevel)}
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                >
                  <option value="idea">Idea / Conceptual</option>
                  <option value="in_development">In Development (Active Coding)</option>
                  <option value="partially_implemented">Partially Implemented (Core features only)</option>
                  <option value="functional_prototype">Functional Prototype (Hackathon / Demo)</option>
                  <option value="completed">Completed Project (Personal / Academic)</option>
                  <option value="deployed">Deployed / Live Production (Real users)</option>
                </select>
              </div>

              <div>
                <label className="block text-graphite mb-1 font-medium">Your Actual Contribution</label>
                <input
                  type="text"
                  value={editContribution}
                  onChange={(e) => setEditContribution(e.target.value)}
                  placeholder="e.g. Built frontend UI and auth flow; team partner handled backend DB"
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs placeholder-graphite focus:outline-none focus:border-stamp"
                />
              </div>

              <div>
                <label className="block text-graphite mb-1 font-medium">Unfinished Features / Known Gaps</label>
                <textarea
                  value={editGaps}
                  onChange={(e) => setEditGaps(e.target.value)}
                  placeholder="e.g. Payment gateway is mocked; caching layer not yet deployed"
                  rows={2}
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs placeholder-graphite focus:outline-none focus:border-stamp"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-paper rounded border border-rule">
                <input
                  type="checkbox"
                  id="prodReady"
                  checked={editProductionReady}
                  onChange={(e) => setEditProductionReady(e.target.checked)}
                  className="rounded bg-paper-deep border-rule text-stamp focus:ring-stamp cursor-pointer"
                />
                <label htmlFor="prodReady" className="text-ink cursor-pointer">
                  Explicitly verified as production-grade with live uptime / users
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMetadataEntryId(null)}
                  className="px-3 py-1.5 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMetadata}
                  className="px-4 py-1.5 bg-stamp hover:bg-stamp-dark disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow"
                >
                  {savingMetadata ? "Saving..." : "Save Scope Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
