"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, Printer, FileDown, Download, Edit3, Clock, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ResumeRecord {
  id: string;
  title: string;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/resumes");
      if (res.ok) {
        const json = await res.json();
        setResumes(json.data || json || []);
      }
    } catch (err) {
      console.error("Failed to load resumes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleCreateResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/v1/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        router.push(`/resumes/${created.id}/edit`);
      }
    } catch (err) {
      console.error("Create resume error:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Resume Documents
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-mono">
              ATS Optimized
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Build, edit, tailor, and export ATS-compliant resumes strictly grounded in your Data Bank facts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Resume
        </button>
      </div>

      {/* Resumes Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-gray-400">Loading your resumes...</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-8 space-y-3">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No resumes created yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Create your first canonical resume document. You can tailor it to target job descriptions at any time.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create First Resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl hover:border-blue-500/50 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{resume.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span>Updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                <Link
                  href={`/resumes/${resume.id}/edit`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Open Editor
                </Link>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/resumes/${resume.id}/print`}
                    target="_blank"
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    title="Print / Save PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href={`/api/v1/resumes/${resume.id}/export/docx`}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                    title="Download DOCX"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`/api/v1/resumes/${resume.id}/export/txt`}
                    className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                    title="Download Plain Text"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-white">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Create New Resume Document
            </h2>
            <form onSubmit={handleCreateResume} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">
                  Resume Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer - 2026"
                  className="w-full text-xs border border-gray-800 rounded-lg p-2.5 bg-gray-950 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 shadow"
                >
                  {creating ? "Creating..." : "Create & Open Editor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
