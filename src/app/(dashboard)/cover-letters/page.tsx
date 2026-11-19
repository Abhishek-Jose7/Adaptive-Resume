"use client";

import React, { useState, useEffect } from "react";
import { Mail, Plus, Trash2, ArrowRight, Clock, Sparkles } from "lucide-react";
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
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
            Cover letters
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
            Write a letter for a job using details from your saved experience.
          </p>
        </div>

        <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary self-start sm:self-auto">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          Write a letter
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center text-[13px] text-graphite">Reading your letters</div>
      ) : letters.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <Mail className="mx-auto h-6 w-6 text-rule-strong" strokeWidth={1.4} />
          <h3 className="mt-3 font-display text-[18px] font-semibold">Nothing written yet</h3>
          <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-graphite">
            Choose a posting and a tone. The letter is assembled from your strongest grounded achievements,
            not from adjectives.
          </p>
          <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary mt-5">
            Write your first letter
          </button>
        </div>
      ) : (
        <div className="panel">
          <div className="plate-caption">
            <span>{letters.length} letters</span>
            <span>tone in brackets</span>
          </div>
          <ul className="divide-y divide-rule">
            {letters.map((letter) => (
              <li key={letter.id} className="group px-4 py-3.5 hover:bg-paper-alt sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14.5px] font-semibold tracking-tight">{letter.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-graphite">
                      <span className="truncate">{letter.jobCompany || "Target organisation"}</span>
                      <span className="font-mono text-[10.5px]">[{letter.tone}]</span>
                    </p>
                  </div>

                  <span className="hidden items-center gap-1 pt-0.5 text-[11.5px] text-graphite sm:flex">
                    <Clock className="h-3 w-3" strokeWidth={1.7} />
                    {new Date(letter.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "2-digit",
                    })}
                  </span>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => handleDelete(letter.id)}
                      className="btn btn-icon hover:text-alarm"
                      title="Delete letter"
                      aria-label="Delete letter"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </button>
                    <Link href={`/cover-letters/${letter.id}`} className="btn btn-sm btn-quiet">
                      Open
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md border border-rule bg-sheet">
            <div className="border-b border-rule px-5 py-3.5">
              <h2 className="font-display text-[17px] font-semibold tracking-tight">Write a letter</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 px-5 py-5">
              <div>
                <label className="field-label">Posting</label>
                <select
                  required
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="select"
                >
                  <option value="">Choose a posting</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} at {j.company || "Company"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Tone</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as CoverLetterTone)}
                  className="select"
                >
                  <option value="professional">Professional and direct</option>
                  <option value="concise">Concise, metric-dense</option>
                  <option value="formal">Formal and executive</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-rule pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="btn btn-quiet"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !selectedJobId}
                  className="btn btn-primary"
                >
                  {generating ? "Writing" : "Write letter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
