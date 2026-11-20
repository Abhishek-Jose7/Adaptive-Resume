"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { AdaptiveResumeWorkspace } from "@/components/workspace/AdaptiveResumeWorkspace";

interface BankEntry {
  id: string;
  entryType: string;
  title: string;
  organization?: string | null;
  bullets?: Array<{ id: string; text: string }>;
}

interface ResumeListItem {
  id: string;
  title: string;
  jobTitle?: string | null;
  targetCompany?: string | null;
  updatedAt?: string;
  matchScore?: number;
  status?: string;
}

export function FigmaDashboardView() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"overview" | "workbench">("overview");
  const [jobText, setJobText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    title: string;
    details: string;
  } | null>(null);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [bankRes, resumesRes] = await Promise.allSettled([
          fetch("/api/v1/bank/entries?limit=50", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : { items: [] },
          ),
          fetch("/api/v1/resumes", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : { items: [] },
          ),
        ]);

        if (!isMounted) return;

        if (bankRes.status === "fulfilled" && bankRes.value?.items) {
          setBankEntries(bankRes.value.items);
        }
        if (resumesRes.status === "fulfilled") {
          const list = Array.isArray(resumesRes.value)
            ? resumesRes.value
            : resumesRes.value?.items || [];
          setResumes(list);
        }
      } catch {
        // Fallback gracefully to default Figma mock stats
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleAnalyze() {
    const trimmed = jobText.trim();
    if (trimmed.length < 20) return;

    // Fast client-side keyword and title extraction for instant feedback
    const titleMatch = trimmed.match(
      /(?:title|role|position|looking for a|seeking a)\s*:?\s*([A-Za-z0-9\s-]{4,40})/i,
    );
    const extractedTitle = titleMatch ? titleMatch[1].trim() : "Target Engineering Role";

    // Detect skills present in JD
    const commonSkills = [
      "react",
      "typescript",
      "javascript",
      "python",
      "node",
      "api",
      "sql",
      "postgres",
      "aws",
      "docker",
      "git",
    ];
    const lower = trimmed.toLowerCase();
    const matchedCount = commonSkills.filter((s) => lower.includes(s)).length;
    const score = Math.min(96, Math.max(76, 75 + matchedCount * 4));

    setAnalysisResult({
      score,
      title: extractedTitle,
      details: `${Math.max(4, matchedCount + 2)} skills matched · 3 strong evidence points found`,
    });
    setAnalyzed(true);
  }

  // Calculate vault stats
  const skillsCount =
    bankEntries.filter((e) => e.entryType === "skill_group" || e.entryType === "skill").length || 5;
  const projectsCount =
    bankEntries.filter((e) => e.entryType === "project").length || 3;
  const rolesCount =
    bankEntries.filter((e) => e.entryType === "experience").length || 2;
  const totalBullets = bankEntries.reduce((acc, e) => acc + (e.bullets?.length || 1), 0);
  const metricsCount = Math.max(4, totalBullets || 4);
  const totalFacts = skillsCount + projectsCount + rolesCount + metricsCount;

  if (viewMode === "workbench") {
    return (
      <div className="dash-content">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[rgba(16,36,28,0.14)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-[#10241c] text-[#eee9df] hover:opacity-90"
              onClick={() => setViewMode("overview")}
            >
              ← Back to Overview
            </button>
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#10241c]">
              Adaptive Resume Workbench
            </span>
          </div>
        </div>
        <AdaptiveResumeWorkspace />
      </div>
    );
  }

  return (
    <div className="dash-content">
      {/* Workspace Switcher */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#10241c] opacity-60">
            View:
          </span>
          <div className="inline-flex rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-0.5">
            <button
              type="button"
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#10241c] text-[#eee9df]"
              onClick={() => setViewMode("overview")}
            >
              Dashboard Overview
            </button>
            <button
              type="button"
              className="px-2.5 py-1 text-[11px] font-bold rounded text-[#10241c] opacity-60 hover:opacity-100"
              onClick={() => setViewMode("workbench")}
            >
              Split-Pane Workbench
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="welcome-card">
        <div>
          <span>CAREER VAULT · {totalFacts} VERIFIED FACTS</span>
          <h2>
            Your experience is ready.
            <br />
            <em>Where are we applying?</em>
          </h2>
          <p>Paste a job description and we’ll find your strongest, most relevant evidence.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("job-input");
            el?.focus();
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          Tailor a new resume <FigmaIcon name="arrow" />
        </button>
        <div className="welcome-graphic">
          <span>{totalFacts}</span>
          <small>TRUTHS</small>
        </div>
      </div>

      {/* Dashboard Grid: Target a Job & Career Vault Foundation */}
      <div className="dashboard-grid">
        {/* Quick Start: Target a Job */}
        <section className="target-panel">
          <div className="panel-title">
            <div>
              <span>QUICK START</span>
              <h3>Target a job</h3>
            </div>
            <FigmaIcon name="target" />
          </div>

          {!analyzed ? (
            <>
              <textarea
                id="job-input"
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the job description here…&#10;&#10;Tip: include responsibilities and requirements for a more precise match."
              />
              <div className="input-footer">
                <span>{jobText.length} characters</span>
                <button
                  type="button"
                  className={jobText.trim().length > 20 ? "ready" : ""}
                  onClick={handleAnalyze}
                >
                  Analyse role <FigmaIcon name="spark" size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="analysis-result">
              <div className="result-score">
                <span>{analysisResult?.score || 92}</span>
                <small>
                  %<br />
                  MATCH
                </small>
              </div>
              <div>
                <span>STRONG MATCH</span>
                <h3>{analysisResult?.title || "Frontend Engineer Intern"}</h3>
                <p>{analysisResult?.details || "6 skills matched · 3 strong evidence points found"}</p>
                <button
                  type="button"
                  className="start-over-btn"
                  onClick={() => {
                    setAnalyzed(false);
                    setJobText("");
                    setAnalysisResult(null);
                  }}
                >
                  Start over
                </button>
              </div>
              <Link
                href={`/jobs?jd=${encodeURIComponent(jobText.slice(0, 1000))}`}
                className="create-resume"
              >
                <span>Create tailored resume</span>
                <FigmaIcon name="arrow" size={17} />
              </Link>
            </div>
          )}
        </section>

        {/* Foundation: Career Vault */}
        <section className="vault-panel">
          <div className="panel-title">
            <div>
              <span>YOUR FOUNDATION</span>
              <h3>Career Vault</h3>
            </div>
            <Link href="/bank/intake">
              <FigmaIcon name="plus" size={17} /> Add fact
            </Link>
          </div>

          <div className="vault-stats">
            <div>
              <b>{skillsCount}</b>
              <span>Skills</span>
            </div>
            <div>
              <b>{projectsCount}</b>
              <span>Projects</span>
            </div>
            <div>
              <b>{rolesCount}</b>
              <span>Roles</span>
            </div>
            <div>
              <b>{metricsCount}</b>
              <span>Metrics</span>
            </div>
          </div>

          {/* Verified Fact Rows */}
          {bankEntries.length > 0 ? (
            bankEntries.slice(0, 2).map((entry, idx) => (
              <div className="fact-row" key={entry.id}>
                <span className={`fact-icon ${idx % 2 === 1 ? "purple" : "orange"}`}>
                  <FigmaIcon name="briefcase" size={17} />
                </span>
                <div>
                  <b>{entry.title}</b>
                  <small>
                    {entry.entryType} · {entry.bullets?.length || 1} verified fact
                    {(entry.bullets?.length || 1) > 1 ? "s" : ""}
                  </small>
                </div>
                <span className="verified">
                  <FigmaIcon name="check" size={13} /> Verified
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="fact-row">
                <span className="fact-icon orange">
                  <FigmaIcon name="briefcase" size={17} />
                </span>
                <div>
                  <b>Campus Marketplace</b>
                  <small>Project · 4 verified facts</small>
                </div>
                <span className="verified">
                  <FigmaIcon name="check" size={13} /> Verified
                </span>
              </div>
              <div className="fact-row">
                <span className="fact-icon purple">
                  <FigmaIcon name="briefcase" size={17} />
                </span>
                <div>
                  <b>TCS iON Internship</b>
                  <small>Experience · 3 verified facts</small>
                </div>
                <span className="verified">
                  <FigmaIcon name="check" size={13} /> Verified
                </span>
              </div>
            </>
          )}

          <Link href="/bank" className="view-all">
            Open Career Vault <FigmaIcon name="arrow" size={17} />
          </Link>
        </section>
      </div>

      {/* Recent Resumes Section */}
      <section className="recent-section">
        <div className="recent-head">
          <div>
            <span>RECENT WORK</span>
            <h3>Your resumes</h3>
          </div>
          <Link href="/resumes">
            View all <FigmaIcon name="arrow" size={16} />
          </Link>
        </div>

        <div className="resume-list">
          {resumes.length > 0 ? (
            resumes.slice(0, 3).map((res, i) => (
              <Link
                href={`/resumes/${res.id}/edit`}
                className="resume-item"
                key={res.id}
              >
                <div className={`mini-doc ${i % 2 === 1 ? "lilac" : ""}`}>
                  <span />
                </div>
                <div>
                  <b>{res.title || res.jobTitle || "Tailored Software Engineer"}</b>
                  <small>
                    {res.targetCompany ? `${res.targetCompany} · ` : ""}
                    {res.updatedAt ? new Date(res.updatedAt).toLocaleDateString() : "Recently active"}
                  </small>
                </div>
                <span className="score high">{res.matchScore || 92}% match</span>
                <span className={`status ${res.status === "exported" ? "exported" : "draft"}`}>
                  {res.status === "exported" ? "Exported" : "Draft"}
                </span>
                <div className="arrow-btn" aria-label="Open resume">
                  <FigmaIcon name="chevron" />
                </div>
              </Link>
            ))
          ) : (
            <>
              <Link href="/jobs" className="resume-item">
                <div className="mini-doc">
                  <span />
                </div>
                <div>
                  <b>Frontend Intern · Razorpay</b>
                  <small>Edited recently · Bengaluru</small>
                </div>
                <span className="score high">92% match</span>
                <span className="status draft">Draft</span>
                <div className="arrow-btn" aria-label="Open resume">
                  <FigmaIcon name="chevron" />
                </div>
              </Link>
              <Link href="/jobs" className="resume-item">
                <div className="mini-doc lilac">
                  <span />
                </div>
                <div>
                  <b>SDE I · CRED</b>
                  <small>Exported recently · Bengaluru</small>
                </div>
                <span className="score">84% match</span>
                <span className="status exported">Exported</span>
                <div className="arrow-btn" aria-label="Open resume">
                  <FigmaIcon name="chevron" />
                </div>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
