"use client";

import React, { useState, useEffect } from "react";
import { Mail, Plus, Clock, Building2, Sparkles, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverLetterTone } from "@/lib/services/coverLetterService";

interface CoverLetterItem {
  id: string;
  title: string;
  jobId: string | null;
  tone: string;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string | null;
  jobCompany?: string | null;
}

export default function CoverLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<CoverLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Array<{ id: string; title: string; company: string }>>([]);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>("professional");
  const [generating, setGenerating] = useState(false);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cover-letters");
      if (res.ok) {
        const json = await res.json();
        setLetters(json.data || json || []);
      }

      const jobsRes = await fetch("/api/v1/jobs");
      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        setAvailableJobs(jobsJson.data || jobsJson || []);
      }
    } catch (err) {
      console.error("Failed to load cover letters", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/v1/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          tone: selectedTone,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        router.push(`/cover-letters/${created.id}`);
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cover letter?")) return;
    setLetters((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/v1/cover-letters/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete error:", err);
      fetchLetters();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            Cover Letters
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Generate and edit tailored, truth-bound cover letters grounded in your verified achievements.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Generate Cover Letter
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading cover letters...</div>
      ) : letters.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-xl space-y-3">
          <Mail className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No cover letters generated yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Target a job posting to generate an executive cover letter backed strictly by your Data Bank.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate Cover Letter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="bg-white border rounded-xl p-5 shadow-xs hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{letter.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded capitalize">
                    {letter.tone}
                  </span>
                </div>

                <div className="text-xs text-gray-600 flex items-center gap-1 mt-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{letter.jobCompany || "Target Organization"}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-2">
                  <Clock className="w-3 h-3" />
                  <span>Updated {new Date(letter.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between">
                <Link
                  href={`/cover-letters/${letter.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit Letter <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => handleDelete(letter.id)}
                  className="text-gray-300 hover:text-red-600 p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Generate Truth-Bound Cover Letter
            </h2>
            <p className="text-xs text-gray-500">
              Select an analyzed job posting. The generator will align your genuine Data Bank achievements without inventing skills.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Job Record
                </label>
                <select
                  required
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- Choose Job Description --</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} at {j.company || "Company"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tone of Voice</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as CoverLetterTone)}
                  className="w-full text-xs border rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="professional">Professional & Direct</option>
                  <option value="concise">Concise & Metric-Dense</option>
                  <option value="formal">Formal & Executive</option>
                  <option value="conversational">Conversational & Engaging</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !selectedJobId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "Generating..." : "Generate Letter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
