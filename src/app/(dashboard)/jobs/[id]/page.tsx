"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { JobRecord, JDAnalysis, JDKeyword } from "@/types/job";
import { KeywordManager } from "@/components/jobs/KeywordManager";
import { MatchScorePanel } from "@/components/jobs/MatchScorePanel";
import { TailoringReviewPanel } from "@/components/jobs/TailoringReviewPanel";
import { ProjectRecommendationPanel } from "@/components/jobs/ProjectRecommendationPanel";
import { SkillsRoadmapView } from "@/components/roadmap/SkillsRoadmapView";
import { Sparkles, ArrowLeft, ExternalLink, Save, Edit, RefreshCw, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobRecord | null>(null);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingResume, setCreatingResume] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "roadmap">("overview");

  const fetchJobData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}`);
      if (!res.ok) throw new Error("Job not found");
      const data = await res.json();
      setJob(data.job);
      setEditedText(data.job.rawText);
      if (data.analysis) {
        setAnalysis(data.analysis.analysisJson);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) fetchJobData();
  }, [jobId]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveEditedText = async () => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: editedText }),
      });
      if (!res.ok) throw new Error("Failed to save edited JD");
      const updated = await res.json();
      setJob(updated);
      setIsEditingText(false);
      handleRunAnalysis();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleKeywordsUpdated = async (updatedKeywords: JDKeyword[]) => {
    const res = await fetch(`/api/v1/jobs/${jobId}/analyze`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: updatedKeywords }),
    });
    if (res.ok) {
      const data = await res.json();
      setAnalysis(data.analysis);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-graphite">
        <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
        Reading the posting
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-display text-[20px] font-semibold">This posting is gone</h2>
        <Link href="/jobs" className="mt-2 inline-block text-[13px] text-stamp hover:underline">
          Back to target jobs
        </Link>
      </div>
    );
  }

  const meta = [
    { label: "seniority", value: analysis?.role.seniority || "not read yet" },
    { label: "work mode", value: analysis?.role.workMode || "not read yet" },
    {
      label: "experience",
      value: analysis?.role.yearsExperience.min ? `${analysis.role.yearsExperience.min}+ years` : "unspecified",
    },
    {
      label: "confidence",
      value: analysis ? `${(analysis.confidence * 100).toFixed(0)}%` : "—",
    },
  ];

  return (
    <div>
      <header className="mb-5 border-b border-rule pb-5">
        <Link
          href="/jobs"
          className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-graphite hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Target jobs
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
              {job.title || "Untitled role"}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-graphite">
              <span className="font-medium text-ink">{job.company || "Company"}</span>
              {job.location && <span>{job.location}</span>}
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-stamp hover:underline"
                >
                  original posting
                  <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleRunAnalysis} disabled={analyzing} className="btn btn-sm">
              {analyzing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-stamp" strokeWidth={1.8} />
              )}
              {analysis ? "Read again" : "Read requirements"}
            </button>
            <button
              onClick={async () => {
                setCreatingResume(true);
                try {
                  const res = await fetch("/api/v1/resumes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: `${job.title}${job.company ? ` — ${job.company}` : ""} Resume`,
                      jobId: job.id,
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to create resume draft");
                  const created = await res.json();
                  const payload = created?.data ?? created;
                  router.push(`/resumes/${payload.id}/edit`);
                } catch (err: any) {
                  setError(err?.message || "Could not create resume draft");
                } finally {
                  setCreatingResume(false);
                }
              }}
              disabled={creatingResume}
              className="btn btn-primary btn-sm"
            >
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              {creatingResume ? "Creating..." : "Tailor a resume"}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 border border-alarm/35 bg-alarm-soft px-3 py-2 text-[12.5px] text-alarm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      {analysis && (
        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 border border-rule bg-sheet px-4 py-3 sm:grid-cols-4">
          {meta.map((item) => (
            <div key={item.label}>
              <dt className="font-mono text-[10.5px] text-graphite">{item.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium capitalize">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="tabbar mb-5">
        <button
          className="tab"
          data-active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className="tab"
          data-active={activeTab === "projects"}
          onClick={() => setActiveTab("projects")}
        >
          Project shortlist
        </button>
        <button
          className="tab"
          data-active={activeTab === "roadmap"}
          onClick={() => setActiveTab("roadmap")}
        >
          Skills gap
        </button>
      </div>

      {activeTab === "projects" && <ProjectRecommendationPanel jobId={job.id} />}

      {activeTab === "roadmap" && (
        <SkillsRoadmapView jobId={job.id} jobTitle={job.title || undefined} />
      )}

      {activeTab === "overview" && (
        <div className="space-y-4">
          {analysis && (
            <>
              <KeywordManager
                jobId={job.id}
                initialKeywords={analysis.keywords}
                onKeywordsUpdated={handleKeywordsUpdated}
              />

              <MatchScorePanel jobId={job.id} />

              <TailoringReviewPanel jobId={job.id} />

              {analysis.responsibilities && analysis.responsibilities.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h3 className="panel-title">Responsibilities read from the posting</h3>
                    <span className="folio">{analysis.responsibilities.length}</span>
                  </div>
                  <ul className="space-y-2 px-5 py-4 text-[13px] leading-relaxed">
                    {analysis.responsibilities.map((resp) => (
                      <li key={resp.id} className="flex gap-2.5">
                        <span className="mt-2 h-px w-2.5 shrink-0 bg-rule-strong" />
                        <span>{resp.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          <section className="panel">
            <div className="panel-head">
              <h3 className="panel-title">Posting text</h3>
              {isEditingText ? (
                <button
                  onClick={handleSaveEditedText}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-press hover:underline"
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Save and re-read
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingText(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-stamp hover:underline"
                >
                  <Edit className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Edit text
                </button>
              )}
            </div>

            <div className="px-4 py-4 sm:px-5">
              {isEditingText ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={12}
                  className="textarea font-mono text-[12px]"
                />
              ) : (
                <div className="max-h-80 overflow-y-auto whitespace-pre-wrap border border-rule bg-paper-alt p-3 font-mono text-[11.5px] leading-relaxed text-ink">
                  {job.rawText}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
