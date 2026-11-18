"use client";

import React, { useState, useEffect } from "react";
import { JobRecord } from "@/types/job";
import {
  Briefcase,
  Plus,
  Link as LinkIcon,
  Search,
  ExternalLink,
  Trash2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Building,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"paste" | "url">("paste");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const payload =
        inputMode === "url"
          ? { url: urlInput.trim() }
          : {
              title: titleInput.trim(),
              company: companyInput.trim(),
              rawText: textInput.trim(),
            };

      const res = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create job");
      }

      const { job } = await res.json();
      setIsModalOpen(false);
      setUrlInput("");
      setTextInput("");
      setTitleInput("");
      setCompanyInput("");
      router.push(`/jobs/${job.id}`);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this target job?")) return;
    const res = await fetch(`/api/v1/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchJobs();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Target Job Postings
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-mono">
              JD Intelligence
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Ingest and analyze job descriptions to tailor resumes, rank projects, and generate skills roadmaps.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Target Job
        </button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" /> Loading saved jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-8 space-y-3">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Target Jobs Yet</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Paste a job description or provide an employer posting URL. Our parser extracts the must-have requirements to tailor your resume.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
          >
            Add Your First Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="border border-gray-800 rounded-2xl bg-gray-900 p-5 shadow-2xl hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                    {job.title || "Target Role"}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteJob(job.id, e)}
                    className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
                    title="Delete job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs font-medium text-gray-400 mt-1 flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-gray-500" />
                  {job.company || "Company"} {job.location && `• ${job.location}`}
                </p>

                <p className="text-xs text-gray-400 line-clamp-3 mt-3">
                  {job.rawText}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-500 text-[11px]">
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
                <span className="text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                  Analyze &amp; Tailor <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Add Target Job Posting
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex border-b border-gray-800 bg-gray-950 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  inputMode === "paste"
                    ? "bg-gray-900 text-blue-400 border-b-2 border-blue-500 font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Paste JD Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  inputMode === "url"
                    ? "bg-gray-900 text-blue-400 border-b-2 border-blue-500 font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Safe URL Scrape
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {inputMode === "url" ? (
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] font-bold mb-1">
                    Job Posting URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <LinkIcon className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Protected by SSRF guards: HTTPS only, private IP blocks, 1 MB cap, and schema.org JSON-LD extraction.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 uppercase text-[10px] font-bold mb-1">
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 uppercase text-[10px] font-bold mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyInput}
                        onChange={(e) => setCompanyInput(e.target.value)}
                        placeholder="e.g. Stripe"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase text-[10px] font-bold mb-1">
                      Job Description Text *
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste responsibilities, requirements, and qualifications..."
                      rows={6}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-sans"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Processing..." : "Save Target Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
