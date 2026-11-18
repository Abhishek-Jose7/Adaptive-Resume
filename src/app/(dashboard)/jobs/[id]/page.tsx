"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { JobRecord, JDAnalysis, JDKeyword } from "@/types/job";
import { KeywordManager } from "@/components/jobs/KeywordManager";
import { MatchScorePanel } from "@/components/jobs/MatchScorePanel";
import { TailoringReviewPanel } from "@/components/jobs/TailoringReviewPanel";
import {
  Briefcase,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Edit,
  Save,
  CheckCircle,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobRecord | null>(null);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      // Re-run analysis on updated text
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
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading job analysis...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-bold text-gray-900">Job Not Found</h2>
        <Link href="/jobs" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Return to Target Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Target Jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {job.title || "Target Role"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {job.company || "Company"} {job.location && `• ${job.location}`}
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline"
              >
                Posting Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analysis ? "Re-Analyze JD" : "Extract Requirements"}
          </button>
          <button
            onClick={() => router.push(`/resumes/new?jobId=${job.id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Tailor Resume for this Job
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Structured Analysis Panel (if analyzed) */}
      {analysis && (
        <div className="space-y-6">
          {/* Role Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 border rounded-xl shadow-xs text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Detected Seniority</span>
              <span className="font-semibold text-gray-800 capitalize">{analysis.role.seniority}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Work Mode</span>
              <span className="font-semibold text-gray-800 capitalize">{analysis.role.workMode}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Experience Range</span>
              <span className="font-semibold text-gray-800">
                {analysis.role.yearsExperience.min ? `${analysis.role.yearsExperience.min}+ years` : "Unspecified"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Analysis Confidence</span>
              <span className="font-semibold text-emerald-600">
                {(analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Interactive Keyword Manager */}
          <KeywordManager
            jobId={job.id}
            initialKeywords={analysis.keywords}
            onKeywordsUpdated={handleKeywordsUpdated}
          />

          {/* Resume-JD Match Score & Gap Analysis */}
          <MatchScorePanel jobId={job.id} />

          {/* Truth-Bound AI Tailoring & Candidate Review */}
          <TailoringReviewPanel jobId={job.id} />

          {/* Key Responsibilities */}
          {analysis.responsibilities && analysis.responsibilities.length > 0 && (
            <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Extracted Core Responsibilities ({analysis.responsibilities.length})
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                {analysis.responsibilities.map((resp) => (
                  <li key={resp.id}>{resp.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw JD Text Accordion / Editor */}
      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Job Description Source Content
          </h3>
          {isEditingText ? (
            <button
              onClick={handleSaveEditedText}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          ) : (
            <button
              onClick={() => setIsEditingText(true)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
            >
              <Edit className="w-3.5 h-3.5" /> Edit JD Text
            </button>
          )}
        </div>

        {isEditingText ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={10}
            className="w-full border rounded-lg p-3 text-xs font-mono bg-gray-50 focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-700 whitespace-pre-wrap font-sans max-h-72 overflow-y-auto leading-relaxed">
            {job.rawText}
          </div>
        )}
      </div>
    </div>
  );
}
