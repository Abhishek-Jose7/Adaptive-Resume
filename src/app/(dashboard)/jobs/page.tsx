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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Target Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ingest and analyze job postings (paste text or fetch safe URL) to tailor your resumes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Target Job
        </button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading saved jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-xl p-8 space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No Target Jobs Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Paste a job description or provide an employer posting URL. Our parser extracts the must-have requirements to tailor your resume.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
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
              className="border border-gray-200 rounded-xl bg-white p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                    {job.title || "Target Role"}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteJob(job.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs font-medium text-gray-600 mt-0.5">
                  {job.company || "Company"} {job.location && `• ${job.location}`}
                </p>

                <p className="text-xs text-gray-500 line-clamp-3 mt-3">
                  {job.rawText}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
                <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View &amp; Tailor <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add Target Job Posting</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex border-b bg-gray-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  inputMode === "paste"
                    ? "bg-white text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Paste JD Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  inputMode === "url"
                    ? "bg-white text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Safe URL Scrape
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {inputMode === "url" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Job Posting URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..."
                      className="w-full border rounded-lg pl-8 pr-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Protected by SSRF guards: HTTPS only, private IP blocks, 1 MB cap, and schema.org JSON-LD extraction.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyInput}
                        onChange={(e) => setCompanyInput(e.target.value)}
                        placeholder="e.g. Stripe"
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Job Description Text *
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste responsibilities, requirements, and qualifications..."
                      rows={6}
                      className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
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
