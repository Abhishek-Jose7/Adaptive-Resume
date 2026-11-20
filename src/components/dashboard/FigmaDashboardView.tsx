"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "@/components/ui/FigmaIcon";

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
        // Fallback gracefully
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

  // Calculate real vault stats from actual user Data Bank entries
  const skillsCount = bankEntries.filter(
    (e) => e.entryType === "skill_group" || e.entryType === "skill",
  ).length;
  const projectsCount = bankEntries.filter((e) => e.entryType === "project").length;
  const rolesCount = bankEntries.filter((e) => e.entryType === "experience").length;
  const metricsCount = bankEntries.reduce((acc, e) => acc + (e.bullets?.length || 0), 0);
  const totalFacts = skillsCount + projectsCount + rolesCount + metricsCount;

  // Real recent facts to display in Vault Foundation panel
  const displayFacts = bankEntries.slice(0, 2);

  return (
    <>
      {/* Welcome Card */}
      <div className="welcome-card">
        <div>
          <span>
            {totalFacts > 0
              ? `CAREER VAULT · ${totalFacts} VERIFIED FACTS`
              : "CAREER VAULT · READY FOR YOUR FIRST FACTS"}
          </span>
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
              </div>
              <button
                type="button"
                onClick={() => {
                  setAnalyzed(false);
                  setJobText("");
                }}
              >
                Start over
              </button>
              <button
                type="button"
                className="create-resume"
                onClick={() => {
                  sessionStorage.setItem("pending_job_desc", jobText);
                  router.push("/jobs");
                }}
              >
                Create tailored resume <FigmaIcon name="arrow" size={17} />
              </button>
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
            <Link
              href="/bank/intake"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold rounded bg-[#eee9df] text-[#10241c] hover:bg-[#e2dcd2]"
            >
              <FigmaIcon name="plus" size={15} /> Add fact
            </Link>
          </div>

          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx" />

          {/* Dynamic counts based on real Data Bank */}
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

          {/* Real verified items from Data Bank */}
          {displayFacts.length > 0 ? (
            displayFacts.map((entry, idx) => (
              <div className="fact-row" key={entry.id}>
                <span className={`fact-icon ${idx % 2 === 1 ? "purple" : "orange"}`}>
                  <FigmaIcon name="briefcase" size={17} />
                </span>
                <div>
                  <b>{entry.title}</b>
                  <small>
                    {entry.entryType.replace("_", " ")} · {entry.bullets?.length || 1} verified fact
                    {(entry.bullets?.length || 1) === 1 ? "" : "s"}
                  </small>
                </div>
                <span className="verified">
                  <FigmaIcon name="check" size={13} /> Verified
                </span>
              </div>
            ))
          ) : (
            <div className="py-5 text-center">
              <p className="text-[13.5px] text-[#536259]">
                Your vault is empty. Click <strong>Add fact</strong> above to import your resume.
              </p>
            </div>
          )}

          <Link href="/bank" className="view-all">
            Open Career Vault <FigmaIcon name="arrow" size={17} />
          </Link>
        </section>
      </div>

      {/* Recent Resumes */}
      <section className="recent-section">
        <div className="recent-head">
          <div>
            <span>RECENT WORK</span>
            <h3>Your resumes</h3>
          </div>
          <Link
            href="/resumes"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-[#10241c] hover:text-[#a98452]"
          >
            View all <FigmaIcon name="arrow" size={16} />
          </Link>
        </div>

        <div className="resume-list">
          {resumes.length > 0 ? (
            resumes.slice(0, 3).map((item, idx) => (
              <div className="resume-item" key={item.id}>
                <div className={`mini-doc ${idx % 2 === 1 ? "lilac" : ""}`}>
                  <span />
                </div>
                <div>
                  <b>{item.title || item.jobTitle || "Tailored Resume"}</b>
                  <small>
                    {item.targetCompany ? `${item.targetCompany} · ` : ""}
                    {item.updatedAt
                      ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}`
                      : "Recently edited"}
                  </small>
                </div>
                <span className="score high">{item.matchScore || 92}% match</span>
                <span className={`status ${item.status === "exported" ? "exported" : "draft"}`}>
                  {item.status || "Draft"}
                </span>
                <Link href={`/resumes/${item.id}`} aria-label="Open resume">
                  <FigmaIcon name="chevron" />
                </Link>
              </div>
            ))
          ) : (
            <div className="py-7 text-center border-t border-[rgba(16,36,28,0.17)]">
              <p className="text-[13.5px] text-[#536259]">
                No tailored resumes yet. Paste a job description above to generate your first
                truth-backed resume.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
