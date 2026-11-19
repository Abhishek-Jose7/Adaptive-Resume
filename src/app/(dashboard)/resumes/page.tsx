"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, Printer, FileDown, Download, RefreshCw, X } from "lucide-react";
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
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
            Resumes
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
            One document per version you would actually send. Open the editor to change a layout, tighten
            a page, or tailor the wording to a posting.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" strokeWidth={1.9} />
          New resume
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-graphite">
          <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
          Reading your documents
        </div>
      ) : resumes.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <FileText className="mx-auto h-6 w-6 text-rule-strong" strokeWidth={1.4} />
          <h3 className="mt-3 font-display text-[18px] font-semibold">No documents yet</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-graphite">
            Start with a job description and build a draft from experience you’ve saved. Make final edits before you export.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-5">
            Create the first resume
          </button>
        </div>
      ) : (
        <div className="panel">
          <div className="plate-caption">
            <span>{resumes.length} documents</span>
            <span>print · docx · text</span>
          </div>
          <ul className="divide-y divide-rule">
            {resumes.map((resume) => (
              <li key={resume.id} className="group px-4 py-3.5 hover:bg-paper-alt sm:px-5">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/resumes/${resume.id}/edit`}
                    className="min-w-0 flex-1"
                  >
                    <h3 className="truncate text-[14.5px] font-semibold tracking-tight group-hover:text-stamp">
                      {resume.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] text-graphite">
                      edited {new Date(resume.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Link
                      href={`/resumes/${resume.id}/print`}
                      target="_blank"
                      className="btn btn-icon"
                      title="Print or save as PDF"
                    >
                      <Printer className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Link>
                    <a
                      href={`/api/v1/resumes/${resume.id}/export/docx`}
                      className="btn btn-icon"
                      title="Download DOCX"
                    >
                      <FileDown className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </a>
                    <a
                      href={`/api/v1/resumes/${resume.id}/export/txt`}
                      className="btn btn-icon"
                      title="Download plain text"
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </a>
                    <Link href={`/resumes/${resume.id}/edit`} className="btn btn-sm btn-quiet ml-1">
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md border border-rule bg-sheet">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
              <h2 className="font-display text-[17px] font-semibold tracking-tight">New resume</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-icon" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleCreateResume} className="space-y-4 px-5 py-5">
              <div>
                <label className="field-label">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Senior backend engineer, 2026"
                  className="input"
                  autoFocus
                />
                <p className="mt-1.5 text-[11.5px] text-graphite">
                  Name it after the role it is for — you will keep several.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-rule pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-quiet">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn btn-primary"
                >
                  {creating ? "Creating" : "Create and open"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
