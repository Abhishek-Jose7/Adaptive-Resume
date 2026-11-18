"use client";

import React, { useState, useEffect } from "react";
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

  const fetchRoadmap = async () => {
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
  };

  useEffect(() => {
    if (jobId) {
      fetchRoadmap();
    }
  }, [jobId]);

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case "critical":
        return "bg-rose-950/60 border-rose-800 text-rose-300";
      case "important":
        return "bg-amber-950/60 border-amber-800 text-amber-300";
      default:
        return "bg-gray-800 border-gray-700 text-gray-400";
    }
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Header */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Evidence-Based Skills Roadmap
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                PRD 18.10
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              {jobTitle ? `Targeting ${jobTitle}. ` : ""}
              Categorized strictly by verified evidence without fabricated percentages.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRoadmap}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors self-start sm:self-auto"
          title="Refresh Roadmap"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary KPI Strip */}
      {roadmap && (
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-gray-800 text-xs">
          <div className="p-3.5 bg-emerald-950/20 border-b sm:border-b-0 sm:border-r border-gray-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-gray-400 text-[11px] block">Tier 1: Confirmed Evidence</span>
              <span className="text-base font-bold text-emerald-300 font-mono">
                {roadmap.summary.strongCount} skills
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-950/20 border-b sm:border-b-0 sm:border-r border-gray-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-gray-400 text-[11px] block">Tier 2: Limited Evidence</span>
              <span className="text-base font-bold text-amber-300 font-mono">
                {roadmap.summary.limitedCount} skills
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-gray-900/40 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <span className="text-gray-400 text-[11px] block">Tier 3: Unrecorded in Bank</span>
              <span className="text-base font-bold text-gray-300 font-mono">
                {roadmap.summary.unrecordedCount} gaps
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Honest assessment note */}
      <div className="px-5 py-2.5 bg-gray-900/60 border-b border-gray-800 text-xs text-gray-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Unrecorded skills represent items not found in your Data Bank, not necessarily skills you do not possess. Add evidence or projects to verify.
        </span>
      </div>

      {/* Tab filter bar */}
      <div className="px-5 py-2 bg-gray-900/30 border-b border-gray-800 flex items-center gap-2 text-xs">
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
                ? "bg-gray-800 text-white border border-gray-700"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content list */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs">Correlating job requirements with Data Bank facts...</p>
          </div>
        ) : !roadmap ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            No roadmap data available. Trigger job description analysis first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show sections based on activeTab */}
            {(activeTab === "all" || activeTab === "unrecorded") &&
              roadmap.unrecordedSkills.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                    Tier 3: Unrecorded Skills &amp; Recommended Bridge Projects
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.unrecordedSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{item.skillName}</span>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${getImportanceBadge(item.importance)}`}>
                            {item.importance}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{item.evidenceDetails}</p>

                        {/* Practical Project Ideas */}
                        {item.practicalProjectIdeas && item.practicalProjectIdeas.length > 0 && (
                          <div className="pt-2 border-t border-gray-800/60 text-xs space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-purple-400 flex items-center gap-1">
                              <FolderPlus className="w-3 h-3" /> Recommended Bridge Project
                            </span>
                            <p className="text-gray-300 text-[11px] bg-purple-950/20 border border-purple-900/30 p-2 rounded-lg">
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
                                className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-gray-950 px-2 py-0.5 rounded border border-gray-800"
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
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Tier 2: Limited Evidence (Mentioned Without Metrics)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.limitedEvidenceSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-amber-950/10 border border-amber-900/30 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{item.skillName}</span>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${getImportanceBadge(item.importance)}`}>
                            {item.importance}
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/80">{item.evidenceDetails}</p>
                        <div className="pt-1">
                          <Link
                            href="/bank"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline font-medium"
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
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Tier 1: Strong Verified Evidence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roadmap.strongEvidenceSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-emerald-950/10 border border-emerald-900/30 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{item.skillName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                            Verified Evidence
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/80">{item.evidenceDetails}</p>
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
