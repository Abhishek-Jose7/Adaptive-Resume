"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { shortenProjectDescription } from "@/lib/utils/projectUtils";
import {
  countIndividualSkills,
  fetchBankEntriesCached,
  getCachedResumesList,
  getCachedVaultSnapshot,
  invalidateVaultCache,
  setCachedResumesList,
} from "@/lib/cache/vaultClientCache";
import { compareReverseChronological } from "@/lib/utils/resumeOrderUtils";
import { analyzeRoleFitAgainstVault, extractRoleTitleFromJd } from "@/lib/scoring/roleFitInsight";

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
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      setVaultError(null);
      const [bankRes, resumesRes] = await Promise.allSettled([
        fetchBankEntriesCached({ forceRefresh }),
        fetch("/api/v1/resumes", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { items: [] },
        ),
      ]);

      if (bankRes.status === "fulfilled" && bankRes.value?.items) {
        setBankEntries(bankRes.value.items as unknown as BankEntry[]);
      } else if (bankRes.status === "rejected") {
        setVaultError("Unable to sync Career Vault right now. Your saved data is safe.");
      }
      if (resumesRes.status === "fulfilled") {
        const list = Array.isArray(resumesRes.value)
          ? resumesRes.value
          : resumesRes.value?.items || [];
        setResumes(list);
        setCachedResumesList(list);
      }
    } catch {
      setVaultError("Unable to sync Career Vault right now. Your saved data is safe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Instant hydration from cached snapshot so returning to Overview never flashes "Upload resume first"
    const cachedVault = getCachedVaultSnapshot();
    const cachedResumes = getCachedResumesList<ResumeListItem>();
    if (cachedVault?.items) {
      setBankEntries(cachedVault.items as unknown as BankEntry[]);
      setLoading(false);
    }
    if (cachedResumes) {
      setResumes(cachedResumes);
    }

    if (isMounted) {
      void loadDashboardData();
    }
    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  function handleAnalyze() {
    const trimmed = jobText.trim();
    if (trimmed.length < 20) return;
    setTailorError(null);

    const insight = analyzeRoleFitAgainstVault(trimmed, bankEntries);

    setAnalysisResult({
      score: insight.score,
      title: insight.extractedTitle,
      details:
        bankEntries.length === 0
          ? "0 facts in Career Vault · Add your experience first"
          : `${insight.matchedSkills.length} of ${insight.matchedSkills.length + insight.missingSkills.length} role requirements verified · ${insight.totalFactsCount} verified facts found`,
      suitabilityVerdict: insight.suitabilityVerdict,
      canApplyRecommendation: insight.summaryInsight,
      matchedSkills: insight.matchedSkills.slice(0, 8),
      missingSkills: insight.missingSkills.slice(0, 6),
    });
    setAnalyzed(true);
  }

  async function handleCreateTailoredResume() {
    const trimmedJd = jobText.trim();
    if (trimmedJd.length < 10) {
      setTailorError("Please paste at least a short job description first.");
      return;
    }
    setCreatingResume(true);
    setTailorError(null);
    try {
      try {
        sessionStorage.removeItem("pending_job_desc");
      } catch {
        // Ignore storage errors
      }

      const roleTitle = analysisResult?.title || extractRoleTitleFromJd(trimmedJd);

      // 1. Create target job
      const jobRes = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roleTitle,
          rawText: trimmedJd,
        }),
      });

      const jobPayload = await jobRes.json().catch(() => ({}));
      if (!jobRes.ok || !jobPayload?.job?.id) {
        throw new Error(
          jobPayload?.error?.message || "Could not save the target job right now. Please try again."
        );
      }
      const { job } = jobPayload;

      // 2. Run & await structured JD analysis before tailoring so /tailor never hits a missing-analysis error
      await fetch(`/api/v1/jobs/${job.id}/analyze`, { method: "POST" }).catch(() => null);

      // 3. Tailor bullets from Career Vault with an 8-second safety timeout
      let tailoredResults: any[] = [];
      const tailorController = new AbortController();
      const timeoutId = setTimeout(() => tailorController.abort(), 8000);
      try {
        const tailorRes = await fetch(`/api/v1/jobs/${job.id}/tailor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "full_resume" }),
          signal: tailorController.signal,
        });
        if (tailorRes.ok) {
          const tailorData = await tailorRes.json().catch(() => null);
          tailoredResults = tailorData?.results || [];
        }
      } catch (tailorErr) {
        console.warn("Tailoring timeout or fallback to vault bullets:", tailorErr);
      } finally {
        clearTimeout(timeoutId);
      }

      // 4. Fetch candidate profile for contact headers
      const meRes: any = await fetch("/api/v1/me", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));

      // 5. Build tailored resume document (preserving exact validatorStatus, Vault bullet order, reverse-chronological dates, and certifications)
      const bulletResultMap = new Map<string, any>();
      for (const r of tailoredResults) {
        bulletResultMap.set(r.bulletId, r);
      }
      const mapBullet = (b: any) => {
        const res = bulletResultMap.get(b.id);
        const passed = res && res.validatorStatus === "passed";
        return {
          id: b.id,
          text: passed ? res.rewrittenText : b.text,
          provenance: passed ? ("ai-rewrite" as const) : ("bank" as const),
          sourceBulletIds: [b.id],
          sourceFactIds: [],
          validatorStatus: res?.validatorStatus || ("not_applicable" as const),
        };
      };

      const orderedExperience = bankEntries
        .filter((e) => e.entryType === "experience")
        .sort(compareReverseChronological);
      const orderedEducation = bankEntries
        .filter((e) => e.entryType === "education")
        .sort(compareReverseChronological);
      const profileEntry = bankEntries.find((e) => e.entryType === "profile" && e.descriptionContext);

      const sections = [
        {
          id: "section-experience",
          type: "experience",
          heading: "Experience",
          visible: true,
          items: orderedExperience.map((e) => ({
            id: e.id,
            sourceEntryId: e.id,
            sourceBulletIds: (e.bullets || []).map((b) => b.id),
            title: e.title,
            organization: e.organization || undefined,
            dates: { start: e.startDate || undefined, end: e.endDate || undefined, current: e.isCurrent },
            location: e.location || undefined,
            bullets: (e.bullets || []).map(mapBullet),
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
              bullets: (e.bullets || []).map(mapBullet),
            })),
        },
        {
          id: "section-education",
          type: "education",
          heading: "Education",
          visible: true,
          items: orderedEducation.map((e) => ({
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

      const certifications = bankEntries
        .filter((e) => e.entryType === "certification")
        .map((c) => ({
          id: c.id,
          name: c.title,
          issuer: c.organization || "",
          issueDate: c.startDate || c.endDate || undefined,
        }));

      const resumeDoc = {
        schemaVersion: 1,
        documentId: "",
        versionId: "",
        jobId: job.id,
        profile: {
          name: meRes.displayName || "",
          fullName: meRes.displayName || "",
          headline: meRes.headline || "",
          summary: profileEntry?.descriptionContext || "",
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
        page: { size: "A4", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        experience: orderedExperience.map((e) => ({
          id: e.id,
          company: e.organization || "Company",
          position: e.title,
          startDate: e.startDate || "",
          endDate: e.endDate || null,
          isCurrent: e.isCurrent ?? false,
          location: e.location || undefined,
          bullets: (e.bullets || []).map(mapBullet),
        })),
        projects: bankEntries
          .filter((e) => e.entryType === "project")
          .map((e) => ({
            id: e.id,
            name: e.title,
            role: e.organization || undefined,
            description: shortenProjectDescription(e.descriptionContext),
            bullets: (e.bullets || []).map(mapBullet),
          })),
        education: orderedEducation.map((e) => ({
          id: e.id,
          institution: e.organization || "Institution",
          degree: e.title || "Degree",
          field: e.descriptionContext || undefined,
          startDate: e.startDate || "",
          endDate: e.endDate || undefined,
        })),
        skills: bankEntries
          .filter((e) => e.entryType === "skill_group" || e.entryType === "skill")
          .flatMap((e) =>
            (e.bullets || []).flatMap((b) =>
              b.text
                .split(/[,•|\n;]+/)
                .map((tok) => tok.trim())
                .filter(Boolean)
                .map((name) => ({ name, category: e.title })),
            ),
          ),
        certifications,
      };

      // 6. Create the resume and navigate directly to the live draft editor
      const createRes = await fetch("/api/v1/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${job.title || roleTitle} resume`,
          jobId: job.id,
          initialDoc: resumeDoc,
        }),
      });

      const createdPayload = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createdPayload?.id) {
        throw new Error(
          createdPayload?.error?.message || "Could not create resume draft right now. Please try again."
        );
      }

      invalidateVaultCache();
      router.push(`/resumes/${createdPayload.id}/edit`);
    } catch (err: any) {
      console.error("Resume creation error:", err);
      setTailorError(err?.message || "Could not build tailored resume right now. Please try again.");
    } finally {
      setCreatingResume(false);
    }
  }

  // Calculate real vault stats from actual user Data Bank entries
  const skillsCount = countIndividualSkills(bankEntries);
  const projectsCount = bankEntries.filter((e) => e.entryType === "project").length;
  const rolesCount = bankEntries.filter((e) => e.entryType === "experience").length;
  const metricsCount = bankEntries
    .filter((e) => e.entryType !== "skill_group" && e.entryType !== "skill")
    .reduce((acc, e) => acc + (e.bullets?.length || 0), 0);
  const totalFacts = skillsCount + projectsCount + rolesCount + metricsCount;
  const showOnboardingPrompt = !loading && !vaultError && totalFacts === 0;

  // Real recent facts to display in Vault Foundation panel (most current roles/projects first)
  const displayFacts = [...bankEntries]
    .filter((e) => e.entryType !== "profile")
    .sort(compareReverseChronological)
    .slice(0, 2);

  return (
    <>
      {/* Welcome Card — never show "Upload resume first" once Career Vault has saved facts, while reading, or on fetch error */}
      <div className="welcome-card">
        <div>
          <span>
            {loading && totalFacts === 0
              ? "CAREER VAULT · LOADING YOUR RECORD"
              : vaultError && totalFacts === 0
                ? "CAREER VAULT · CONNECTION ISSUE"
                : totalFacts > 0
                  ? `CAREER VAULT · ${totalFacts} VERIFIED FACTS`
                  : "STEP 1 · BUILD YOUR CAREER VAULT FIRST"}
          </span>
          {showOnboardingPrompt ? (
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
          ) : vaultError && totalFacts === 0 ? (
            <>
              <h2>
                Your records are safe.
                <br />
                <em>Retry syncing Vault.</em>
              </h2>
              <p>{vaultError}</p>
            </>
          ) : (
            <>
              <h2>
                Your experience is ready.
                <br />
                <em>Where are we applying?</em>
              </h2>
              <p>
                {loading && totalFacts === 0
                  ? "Loading your verified Career Vault records…"
                  : "Paste a job description and we’ll find your strongest, most relevant evidence."}
              </p>
            </>
          )}
        </div>
        {showOnboardingPrompt ? (
          <Link href="/bank/intake" className="welcome-cta">
            Upload resume to Vault <FigmaIcon name="arrow" />
          </Link>
        ) : vaultError && totalFacts === 0 ? (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadDashboardData(true);
            }}
          >
            Retry syncing Vault <FigmaIcon name="arrow" />
          </button>
        ) : (
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
        )}
        <div className="welcome-graphic">
          <span>{totalFacts > 0 ? totalFacts : loading ? "···" : vaultError ? "!" : "0"}</span>
          <small>{totalFacts > 0 ? "TRUTHS" : loading ? "SYNC" : vaultError ? "RETRY" : "START"}</small>
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
              {showOnboardingPrompt && (
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
              {tailorError && (
                <div className="mb-3 rounded border border-red-700/25 bg-red-50/70 px-3 py-2 text-[12.5px] font-medium text-red-900">
                  {tailorError}
                </div>
              )}
              <div className="input-footer">
                <span>{jobText.length} characters</span>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={creatingResume || jobText.trim().length < 20}
                    onClick={handleAnalyze}
                  >
                    Analyse role <FigmaIcon name="spark" size={16} />
                  </button>
                  <button
                    type="button"
                    className={jobText.trim().length >= 10 ? "ready" : ""}
                    disabled={creatingResume || jobText.trim().length < 10}
                    onClick={handleCreateTailoredResume}
                  >
                    {creatingResume ? (
                      <>Tailoring draft… <FigmaIcon name="spark" size={16} /></>
                    ) : (
                      <>Tailor a resume <FigmaIcon name="arrow" size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="analysis-result">
              {tailorError && (
                <div className="mb-3 rounded border border-red-700/25 bg-red-50/70 px-3 py-2 text-[12.5px] font-medium text-red-900">
                  {tailorError}
                </div>
              )}
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
                    {entry.entryType.replace("_", " ")} · {entry.bullets?.length || 0} bullet
                    {(entry.bullets?.length || 0) === 1 ? "" : "s"}
                  </small>
                </div>
                <span className="verified">
                  <FigmaIcon name="check" size={13} /> Verified
                </span>
              </div>
            ))
          ) : loading ? (
            <div className="py-6 text-center border-t border-[rgba(16,36,28,0.1)]">
              <p className="text-[13px] text-[#536259]">Syncing your verified records…</p>
            </div>
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
                {typeof item.matchScore === "number" ? (
                  <span className="score high">{item.matchScore}% match</span>
                ) : (
                  <span className="score">Tailored draft</span>
                )}
                <span className={`status ${item.status === "exported" ? "exported" : "draft"}`}>
                  {item.status || "Draft"}
                </span>
                <Link href={`/resumes/${item.id}/edit`} aria-label="Open resume">
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
