"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, Printer, FileDown, Download, Edit3, Clock, Sparkles } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Resume Documents
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Build, edit, tailor, and export ATS-compliant resumes strictly grounded in your Data Bank.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create New Resume
        </button>
      </div>

      {/* Resumes Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading your resumes...</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-xl space-y-3">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No resumes created yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Create your first canonical resume document. You can tailor it to target job descriptions at any time.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" /> Create Resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white border rounded-xl p-5 shadow-xs hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900 line-clamp-1">{resume.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    Draft
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <Link
                  href={`/resumes/${resume.id}/edit`}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Resume
                </Link>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/resumes/${resume.id}/print`}
                    target="_blank"
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded"
                    title="Print / Save PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </Link>
                  <a
                    href={`/api/v1/resumes/${resume.id}/export/docx`}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
                    title="Download DOCX"
                  >
                    <FileDown className="w-4 h-4" />
                  </a>
                  <a
                    href={`/api/v1/resumes/${resume.id}/export/txt`}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Download Plain Text"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create New Resume Document</h2>
            <form onSubmit={handleCreateResume} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resume Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer - 2026"
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
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
