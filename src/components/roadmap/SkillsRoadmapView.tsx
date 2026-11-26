"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  FolderPlus,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
} from "lucide-react";
import { CompleteSkillsRoadmap } from "@/lib/scoring/skillsRoadmapEngine";
import { SkillsRoadmapItem } from "@/types/job";
import Link from "next/link";

interface SkillsRoadmapViewProps {
  jobId: string;
  jobTitle?: string;
}

export function SkillsRoadmapView({ jobId, jobTitle }: SkillsRoadmapViewProps) {
  const [roadmap, setRoadmap] = useState<CompleteSkillsRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "strong" | "limited" | "unrecorded">("all");

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/skills-roadmap`);
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      fetchRoadmap();
    }
  }, [jobId, fetchRoadmap]);

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case "critical":
        return "bg-alarm-soft border-alarm text-alarm";
      case "important":
        return "bg-marker-soft border-marker text-marker-dark";
      default:
        return "bg-paper-deep border-rule text-graphite";
    }
  };

  return (
    <div className="bg-paper border border-rule rounded-lg overflow-hidden shadow-plate text-ink">
      {/* Header */}
      <div className="p-4 bg-sheet border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-press-soft border border-press/30 rounded-lg text-press">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              Evidence-Based Skills Roadmap
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-press-soft text-press border border-press/30 rounded-full">
                PRD 18.10
              </span>
            </h3>
            <p className="text-xs text-graphite">
              {jobTitle ? `Targeting ${jobTitle}. ` : ""}
              Categorized strictly by verified evidence without fabricated percentages.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRoadmap}
          disabled={loading}
          className="p-1.5 text-graphite hover:text-ink rounded-lg hover:bg-paper-deep transition-colors self-start sm:self-auto"
          title="Refresh Roadmap"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary KPI Strip */}
      {roadmap && (
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-rule text-xs">
          <div className="p-3.5 bg-press-soft border-b sm:border-b-0 sm:border-r border-rule flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-press shrink-0" />
            <div>
              <span className="text-graphite text-[11px] block">Tier 1: Confirmed Evidence</span>
              <span className="text-base font-bold text-press font-mono">
                {roadmap.summary.strongCount} skills
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-marker-soft border-b sm:border-b-0 sm:border-r border-rule flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-marker-dark shrink-0" />
            <div>
              <span className="text-graphite text-[11px] block">Tier 2: Limited Evidence</span>
              <span className="text-base font-bold text-marker-dark font-mono">
                {roadmap.summary.limitedCount} skills
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-sheet/40 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-graphite shrink-0" />
            <div>
              <span className="text-graphite text-[11px] block">Tier 3: Unrecorded in Bank</span>
              <span className="text-base font-bold text-ink font-mono">
                {roadmap.summary.unrecordedCount} gaps
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Honest assessment note */}
      <div className="px-5 py-2.5 bg-sheet/60 border-b border-rule text-xs text-graphite flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-press shrink-0" />
        <span>
          Unrecorded skills represent items not found in your Data Bank, not necessarily skills you do not possess. Add evidence or projects to verify.
        </span>
      </div>

      {/* Tab filter bar */}
      <div className="px-5 py-2 bg-sheet/30 border-b border-rule flex items-center gap-2 text-xs">
        {[
          { id: "all", label: "All Skills" },
          { id: "strong", label: `Strong (${roadmap?.summary.strongCount || 0})` },
          { id: "limited", label: `Limited (${roadmap?.summary.limitedCount || 0})` },
          { id: "unrecorded", label: `Unrecorded (${roadmap?.summary.unrecordedCount || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-paper-deep text-ink border border-rule"
                : "text-graphite hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content list */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-graphite space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-press" />
            <p className="text-xs">Correlating job requirements with Data Bank facts...</p>
          </div>
        ) : !roadmap ? (
          <div className="text-center py-12 text-graphite text-xs">
            No roadmap data available. Trigger job description analysis first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show sections based on activeTab */}
            {(activeTab === "all" || activeTab === "unrecorded") &&
              roadmap.unrecordedSkills.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-graphite normal-case tracking-normal flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-graphite" />
                    Tier 3: Unrecorded Skills &amp; Recommended Bridge Projects
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.unrecordedSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-sheet/60 border border-rule rounded-lg space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-sm">{item.skillName}</span>
                          <span className={`text-[10px] normal-case font-mono px-2 py-0.5 rounded border ${getImportanceBadge(item.importance)}`}>
                            {item.importance}
                          </span>
                        </div>
                        <p className="text-xs text-graphite">{item.evidenceDetails}</p>

                        {/* Practical Project Ideas */}
                        {item.practicalProjectIdeas && item.practicalProjectIdeas.length > 0 && (
                          <div className="pt-2 border-t border-rule/60 text-xs space-y-1">
                            <span className="text-[10px] normal-case font-semibold text-stamp flex items-center gap-1">
                              <FolderPlus className="w-3 h-3" /> Recommended Bridge Project
                            </span>
                            <p className="text-ink text-[11px] bg-stamp-soft border border-stamp/30 p-2 rounded-lg">
                              {item.practicalProjectIdeas[0]}
                            </p>
                          </div>
                        )}

                        {/* Learning Resources */}
                        {item.learningResources && item.learningResources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.learningResources.map((res, rIdx) => (
                              <a
                                key={rIdx}
                                href={res.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-stamp hover:text-stamp bg-paper px-2 py-0.5 rounded border border-rule"
                              >
                                <BookOpen className="w-3 h-3" /> {res.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Tier 2: Limited Evidence */}
            {(activeTab === "all" || activeTab === "limited") &&
              roadmap.limitedEvidenceSkills.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold text-marker-dark normal-case tracking-normal flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-marker-dark" />
                    Tier 2: Limited Evidence (Mentioned Without Metrics)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.limitedEvidenceSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-marker-soft border border-marker/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-sm">{item.skillName}</span>
                          <span className={`text-[10px] normal-case font-mono px-2 py-0.5 rounded border ${getImportanceBadge(item.importance)}`}>
                            {item.importance}
                          </span>
                        </div>
                        <p className="text-xs text-marker-dark/80">{item.evidenceDetails}</p>
                        <div className="pt-1">
                          <Link
                            href="/bank"
                            className="inline-flex items-center gap-1 text-[11px] text-marker-dark hover:underline font-medium"
                          >
                            <Plus className="w-3 h-3" /> Add verified metrics in Data Bank
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Tier 1: Strong Evidence */}
            {(activeTab === "all" || activeTab === "strong") &&
              roadmap.strongEvidenceSkills.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold text-press normal-case tracking-normal flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-press" />
                    Tier 1: Strong Verified Evidence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.strongEvidenceSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-press-soft border border-press/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-sm">{item.skillName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-press-soft border border-press text-press">
                            Verified Evidence
                          </span>
                        </div>
                        <p className="text-xs text-press/80">{item.evidenceDetails}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
