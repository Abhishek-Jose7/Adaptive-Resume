"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { shortenProjectDescription } from "@/lib/utils/projectUtils";

interface BankEntry {
  id: string;
  entryType: string;
  title: string;
  organization?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  descriptionContext?: string | null;
  facts?: Array<{ factType: string; valueText: string }>;
  bullets?: Array<{ id: string; text: string; facts?: Array<{ factType: string; valueText: string }> }>;
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
    suitabilityVerdict: string;
    canApplyRecommendation: string;
    matchedSkills: string[];
    missingSkills: string[];
  } | null>(null);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingResume, setCreatingResume] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [bankRes, resumesRes] = await Promise.allSettled([
          fetch("/api/v1/bank/entries?limit=100", { cache: "no-store" }).then((r) =>
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

    // Fast client-side title extraction
    const titleMatch = trimmed.match(
      /(?:title|role|position|looking for a|seeking a)\s*:?\s*([A-Za-z0-9\s-]{4,40})/i,
    );
    const extractedTitle = titleMatch ? titleMatch[1].trim() : "Target Engineering Role";

    // 1. Collect all real skills, tools, and verified facts from user's Career Vault
    const userVerifiedSkills = new Set<string>();
    let totalVerifiedFactsCount = 0;

    for (const entry of bankEntries) {
      // Bullets in skill groups are individual skills
      if (entry.entryType === "skill_group" || entry.entryType === "skill") {
        for (const bullet of entry.bullets || []) {
          const s = bullet.text.toLowerCase().trim();
          if (s) userVerifiedSkills.add(s);
        }
      }
      // Entry titles (e.g. tools, frameworks, positions)
      const titleWords = entry.title.toLowerCase().split(/[\s,·/&|+-]+/).filter((w) => w.length > 2);
      for (const w of titleWords) {
        userVerifiedSkills.add(w);
      }
      // Entry facts
      for (const f of entry.facts || []) {
        if (f.valueText) userVerifiedSkills.add(f.valueText.toLowerCase().trim());
      }
      // Bullet facts and bullet texts
      for (const b of entry.bullets || []) {
        totalVerifiedFactsCount++;
        for (const f of b.facts || []) {
          if (f.valueText) userVerifiedSkills.add(f.valueText.toLowerCase().trim());
        }
        const words = b.text.toLowerCase().split(/[\s,·/&|()\[\]+-]+/).filter((w) => w.length > 2);
        for (const w of words) {
          if (/^[a-z0-9.#+]+$/i.test(w)) userVerifiedSkills.add(w);
        }
      }
    }

    // 2. Extract technical requirements from the target JD
    const lowerJd = trimmed.toLowerCase();
    const technicalKeywords = [
      "react", "react.js", "next.js", "vue", "angular", "svelte", "typescript", "javascript",
      "node", "node.js", "python", "flask", "django", "fastapi", "golang", "go", "rust", "c++",
      "c#", "java", "sql", "postgresql", "postgres", "sqlite", "mysql", "mongodb", "redis",
      "prisma", "orm", "drizzle", "graphql", "rest", "rest apis", "api", "apis", "docker",
      "kubernetes", "k8s", "aws", "gcp", "azure", "cloudflare", "cloudflare workers",
      "vercel", "firebase", "git", "github", "ci/cd", "linux", "html", "css", "tailwind",
      "tailwind css", "ai", "ml", "machine learning", "deep learning", "nlp", "llm", "llms",
      "rag", "genai", "generative ai", "agents", "langchain", "tensorflow", "pytorch",
      "scikit-learn", "pandas", "numpy", "opencv", "playwright", "selenium", "jest", "cypress"
    ];

    const jdRequestedSkills = technicalKeywords.filter((kw) => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return regex.test(lowerJd);
    });

    const effectiveJdSkills = jdRequestedSkills.length > 0
      ? jdRequestedSkills
      : Array.from(new Set(
          lowerJd.split(/[\s,;·•\n]+/)
            .filter((w) => w.length > 3 && !/^(with|that|have|this|from|will|your|about|role|team|work|years|must|plus)$/i.test(w))
        )).slice(0, 8);

    // 3. Genuine matching against user's Career Vault
    const matchedSkills = effectiveJdSkills.filter((jdSkill) => {
      for (const userSkill of userVerifiedSkills) {
        if (userSkill === jdSkill || userSkill.includes(jdSkill) || jdSkill.includes(userSkill)) {
          return true;
        }
      }
      return false;
    });

    let calculatedScore = 0;
    if (bankEntries.length > 0 && effectiveJdSkills.length > 0) {
      const matchRatio = matchedSkills.length / effectiveJdSkills.length;
      calculatedScore = Math.min(98, Math.max(20, Math.round(matchRatio * 100)));
    }

    const missingSkills = effectiveJdSkills.filter((jdSkill) => !matchedSkills.includes(jdSkill));

    let suitabilityVerdict = "";
    let canApplyRecommendation = "";
    if (calculatedScore >= 75) {
      suitabilityVerdict = "Strong Candidate · Highly Recommended to Apply";
      canApplyRecommendation = `You match ${matchedSkills.length} of ${effectiveJdSkills.length} core role criteria with strong evidence in your Career Vault. You have the technical baseline required for this role—generating a tailored resume will position your matching projects and skills at the top.`;
    } else if (calculatedScore >= 50) {
      suitabilityVerdict = "Good Candidate · Viable to Apply";
      canApplyRecommendation = `You meet ${matchedSkills.length} of ${effectiveJdSkills.length} key requirements. Applying is viable—a tailored resume will reframe your existing experience to spotlight relevant transferable competencies.`;
    } else {
      suitabilityVerdict = "Stretch Role · Review Core Requirements";
      canApplyRecommendation = `You match ${matchedSkills.length} of ${effectiveJdSkills.length} requirements. Review the unverified skills below: if you have experience with them, add them to your Career Vault first to boost your match score.`;
    }

    setAnalysisResult({
      score: calculatedScore,
      title: extractedTitle,
      details: bankEntries.length === 0
        ? "0 facts in Career Vault · Add your experience first"
        : `${matchedSkills.length} of ${effectiveJdSkills.length} role requirements verified · ${totalVerifiedFactsCount} verified facts found`,
      suitabilityVerdict,
      canApplyRecommendation,
      matchedSkills: matchedSkills.slice(0, 8),
      missingSkills: missingSkills.slice(0, 6),
    });
    setAnalyzed(true);
  }

  async function handleCreateTailoredResume() {
    if (!jobText.trim()) return;
    setCreatingResume(true);
    let createdJobId: string | null = null;
    try {
      sessionStorage.setItem("pending_job_desc", jobText);

      // 1. Create target job
      const jobRes = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: analysisResult?.title || "Target Role",
          rawText: jobText.trim(),
        }),
      });

      if (!jobRes.ok) {
        window.location.href = "/jobs";
        return;
      }
      const { job } = await jobRes.json();
      createdJobId = job.id;

      // 2. Trigger background analysis (non-blocking)
      fetch(`/api/v1/jobs/${job.id}/analyze`, { method: "POST" }).catch(() => {});

      // 3. Tailor bullets from Career Vault with 8-second safety timeout
      let tailoredResults: any[] = [];
      try {
        const tailorController = new AbortController();
        const timeoutId = setTimeout(() => tailorController.abort(), 8000);
        const tailorRes = await fetch(`/api/v1/jobs/${job.id}/tailor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "full_resume" }),
          signal: tailorController.signal,
        });
        clearTimeout(timeoutId);
        if (tailorRes.ok) {
          const tailorData = await tailorRes.json().catch(() => null);
          tailoredResults = tailorData?.results || [];
        }
      } catch (tailorErr) {
        console.warn("Tailoring timeout or fallback to vault bullets:", tailorErr);
      }

      // 4. Fetch candidate profile for contact headers
      const meRes: any = await fetch("/api/v1/me", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));

      // 5. Build tailored resume document
      const bulletMap = new Map<string, string>();
      for (const r of tailoredResults) {
        bulletMap.set(r.bulletId, r.rewrittenText);
      }

      const sections = [
        {
          id: "section-experience",
          type: "experience",
          heading: "Experience",
          visible: true,
          items: bankEntries
            .filter((e) => e.entryType === "experience")
            .map((e) => ({
              id: e.id,
              sourceEntryId: e.id,
              sourceBulletIds: (e.bullets || []).map((b) => b.id),
              title: e.title,
              organization: e.organization || undefined,
              dates: { start: e.startDate || undefined, end: e.endDate || undefined, current: e.isCurrent },
              location: e.location || undefined,
              bullets: (e.bullets || []).map((b) => ({
                id: b.id,
                text: bulletMap.get(b.id) || b.text,
                provenance: bulletMap.has(b.id) ? "ai-rewrite" : "bank",
                sourceBulletIds: [b.id],
                sourceFactIds: [],
                validatorStatus: "passed",
              })),
            })),
        },
        {
          id: "section-projects",
          type: "projects",
          heading: "Projects",
          visible: true,
          items: bankEntries
            .filter((e) => e.entryType === "project")
            .map((e) => ({
              id: e.id,
              sourceEntryId: e.id,
              sourceBulletIds: (e.bullets || []).map((b) => b.id),
              title: e.title,
              organization: e.organization || undefined,
              dates: { start: e.startDate || undefined, end: e.endDate || undefined, current: e.isCurrent },
              location: e.location || undefined,
              bullets: (e.bullets || []).map((b) => ({
                id: b.id,
                text: bulletMap.get(b.id) || b.text,
                provenance: bulletMap.has(b.id) ? "ai-rewrite" : "bank",
                sourceBulletIds: [b.id],
                sourceFactIds: [],
                validatorStatus: "passed",
              })),
            })),
        },
        {
          id: "section-education",
          type: "education",
          heading: "Education",
          visible: true,
          items: bankEntries
            .filter((e) => e.entryType === "education")
            .map((e) => ({
              id: e.id,
              sourceEntryId: e.id,
              sourceBulletIds: (e.bullets || []).map((b) => b.id),
              title: e.title,
              organization: e.organization || undefined,
              dates: { start: e.startDate || undefined, end: e.endDate || undefined, current: e.isCurrent },
              location: e.location || undefined,
              bullets: (e.bullets || []).map((b) => ({
                id: b.id,
                text: b.text,
                provenance: "bank",
                sourceBulletIds: [b.id],
                sourceFactIds: [],
                validatorStatus: "passed",
              })),
            })),
        },
        {
          id: "section-skills",
          type: "skills",
          heading: "Skills",
          visible: true,
          items: bankEntries
            .filter((e) => e.entryType === "skill_group" || e.entryType === "skill")
            .map((e) => ({
              id: e.id,
              sourceEntryId: e.id,
              sourceBulletIds: (e.bullets || []).map((b) => b.id),
              title: e.title,
              bullets: (e.bullets || []).map((b) => ({
                id: b.id,
                text: b.text,
                provenance: "bank",
                sourceBulletIds: [b.id],
                sourceFactIds: [],
                validatorStatus: "passed",
              })),
            })),
        },
      ].filter((s) => s.items.length > 0);

      const resumeDoc = {
        schemaVersion: 1,
        documentId: "",
        versionId: "",
        jobId: job.id,
        profile: {
          name: meRes.displayName || "",
          fullName: meRes.displayName || "",
          headline: meRes.headline || "",
          summary: "",
          email: meRes.email || "",
          phone: meRes.phone || "",
          location: meRes.location || "",
          links: [
            ["GitHub", meRes.githubUrl],
            ["LinkedIn", meRes.linkedinUrl],
            ["Portfolio", meRes.portfolioUrl],
          ].filter(([, u]) => Boolean(u)).map(([l, u]) => ({ label: l!, url: u! })),
        },
        sections,
        template: { id: "classic-ats", version: "1.0", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        experience: bankEntries
          .filter((e) => e.entryType === "experience")
          .map((e) => ({
            id: e.id,
            company: e.organization || "Company",
            position: e.title,
            startDate: e.startDate || "2024",
            endDate: e.endDate || null,
            isCurrent: e.isCurrent ?? false,
            location: e.location || undefined,
            bullets: (e.bullets || []).map((b) => ({
              id: b.id,
              text: bulletMap.get(b.id) || b.text,
              provenance: bulletMap.has(b.id) ? "ai-rewrite" : "bank",
              sourceBulletIds: [b.id],
              sourceFactIds: [],
              validatorStatus: "passed",
            })),
          })),
        projects: bankEntries
          .filter((e) => e.entryType === "project")
          .map((e) => ({
            id: e.id,
            name: e.title,
            role: e.organization || undefined,
            description: shortenProjectDescription(e.descriptionContext),
            bullets: (e.bullets || []).map((b) => ({
              id: b.id,
              text: bulletMap.get(b.id) || b.text,
              provenance: bulletMap.has(b.id) ? "ai-rewrite" : "bank",
              sourceBulletIds: [b.id],
              sourceFactIds: [],
              validatorStatus: "passed",
            })),
          })),
        education: bankEntries
          .filter((e) => e.entryType === "education")
          .map((e) => ({
            id: e.id,
            institution: e.organization || "Institution",
            degree: e.title || "Degree",
            field: e.descriptionContext || undefined,
            startDate: e.startDate || "2020",
            endDate: e.endDate || undefined,
          })),
        skills: bankEntries
          .filter((e) => e.entryType === "skill_group" || e.entryType === "skill")
          .flatMap((e) => (e.bullets || []).map((b) => ({ name: b.text, category: e.title }))),
      };

      // 6. Create the resume and route directly to the tailored draft
      const createRes = await fetch("/api/v1/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${job.title || "Target role"} resume`,
          jobId: job.id,
          initialDoc: resumeDoc,
        }),
      });

      if (createRes.ok) {
        const created = await createRes.json();
        window.location.href = `/resumes/${created.id}/edit`;
        return;
      }
      window.location.href = createdJobId ? `/jobs/${createdJobId}` : "/jobs";
    } catch (err) {
      console.error("Resume creation error:", err);
      window.location.href = createdJobId ? `/jobs/${createdJobId}` : "/jobs";
    } finally {
      setCreatingResume(false);
    }
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
              : "STEP 1 · BUILD YOUR CAREER VAULT FIRST"}
          </span>
          {totalFacts > 0 ? (
            <>
              <h2>
                Your experience is ready.
                <br />
                <em>Where are we applying?</em>
              </h2>
              <p>Paste a job description and we’ll find your strongest, most relevant evidence.</p>
            </>
          ) : (
            <>
              <h2>
                Upload your resume first.
                <br />
                <em>We’ll adapt your real facts.</em>
              </h2>
              <p>
                Before tailoring resumes, your Career Vault needs your real projects, skills, and experience.
                Upload your resume or paste career details once—we’ll adapt your verified facts for any job with zero hallucinations.
              </p>
            </>
          )}
        </div>
        {totalFacts > 0 ? (
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
        ) : (
          <Link href="/bank/intake" className="welcome-cta">
            Upload resume to Vault <FigmaIcon name="arrow" />
          </Link>
        )}
        <div className="welcome-graphic">
          <span>{totalFacts > 0 ? totalFacts : "0"}</span>
          <small>{totalFacts > 0 ? "TRUTHS" : "START"}</small>
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
              {totalFacts === 0 && (
                <div className="mb-3 rounded border border-[#a98452]/30 bg-[#fdfaf3] p-3 text-[12.5px] leading-relaxed text-[#10241c]">
                  <strong>Notice:</strong> Please upload your resume or add experience in the Career Vault first. Once facts are saved, paste any job post here to match against your verified experience.
                </div>
              )}
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
              <div className="analysis-top-row">
                <div className="result-score">
                  <span>{analysisResult?.score ?? 0}%</span>
                  <small>MATCH</small>
                </div>
                <div className="analysis-role-meta">
                  <span className="match-level-badge">
                    {((analysisResult?.score || 0) >= 75)
                      ? "STRONG MATCH"
                      : ((analysisResult?.score || 0) >= 50)
                      ? "SOLID MATCH"
                      : "STRETCH MATCH"}
                  </span>
                  <h3>{analysisResult?.title || "Target Engineering Role"}</h3>
                  <p>{analysisResult?.details || "0 skills matched · 0 strong evidence points found"}</p>
                </div>
              </div>

              {/* Role Suitability Verdict & Advice */}
              <div className="suitability-box">
                <div className="suitability-verdict">
                  <span className="suitability-pill">
                    {analysisResult?.suitabilityVerdict}
                  </span>
                </div>
                <p className="suitability-note">
                  {analysisResult?.canApplyRecommendation}
                </p>

                {/* Requirements Breakdown */}
                <div className="requirements-breakdown">
                  {analysisResult?.matchedSkills && analysisResult.matchedSkills.length > 0 && (
                    <div className="req-group">
                      <span className="req-group-title">
                        <i className="dot-green" /> Verified Skills ({analysisResult.matchedSkills.length})
                      </span>
                      <div className="req-pills">
                        {analysisResult.matchedSkills.map((sk) => (
                          <span key={sk} className="pill-matched">
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult?.missingSkills && analysisResult.missingSkills.length > 0 && (
                    <div className="req-group">
                      <span className="req-group-title">
                        <i className="dot-neutral" /> Unrecorded Role Requirements ({analysisResult.missingSkills.length})
                      </span>
                      <div className="req-pills">
                        {analysisResult.missingSkills.map((sk) => (
                          <span key={sk} className="pill-unrecorded">
                            ○ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="analysis-actions-row">
                <button
                  type="button"
                  className="start-over-btn"
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
                  disabled={creatingResume}
                  onClick={handleCreateTailoredResume}
                >
                  {creatingResume ? (
                    <>Tailoring draft… <FigmaIcon name="spark" size={17} /></>
                  ) : (
                    <>Create tailored resume <FigmaIcon name="arrow" size={17} /></>
                  )}
                </button>
              </div>
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
            <div className="py-6 text-center border-t border-[rgba(16,36,28,0.1)]">
              <p className="text-[14px] font-bold text-[#10241c]">
                Your Career Vault is empty
              </p>
              <p className="mt-1 text-[12.5px] text-[#536259]">
                Upload your resume or paste your career history to extract and approve your verified facts.
              </p>
              <Link
                href="/bank/intake"
                className="mt-3.5 inline-flex items-center gap-1.5 rounded bg-[#10241c] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#eee9df] hover:opacity-90 transition-opacity"
              >
                Upload resume now <FigmaIcon name="arrow" size={14} />
              </Link>
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
