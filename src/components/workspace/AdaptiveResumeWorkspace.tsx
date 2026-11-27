"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, ClipboardPaste, FileText, LoaderCircle, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import type { ResumeDoc, ResumeBulletDoc, ResumeSectionDoc, ResumeItemDoc } from "@/types/resume";
import { compareReverseChronological } from "@/lib/utils/resumeOrderUtils";
import { invalidateVaultCache } from "@/lib/cache/vaultClientCache";
import { analyzeRoleFitAgainstVault } from "@/lib/scoring/roleFitInsight";
import {
  extractProfileSummaryFromEntries,
  normalizeDistinctAwardIssuer,
  selectExperienceBulletsForRole,
  selectProjectAnglePoints,
  sortProjectsByConfidenceAndRelevance,
} from "@/lib/tailoring/projectAngleSelector";

type WorkspaceTab = "write" | "history";
type PreviewPane = "job" | "resume";
type JobSummary = {
  id: string;
  title?: string | null;
  company?: string | null;
  rawText: string;
  createdAt?: string;
};
type TailoredResult = {
  bulletId: string;
  originalText: string;
  rewrittenText: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  validatorStatus: "passed" | "rejected" | "fallback_to_source";
  status: "pending" | "accepted" | "rejected";
};
type BankEntry = {
  id: string;
  entryType: string;
  title: string;
  organization?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  sortOrder?: number;
  descriptionContext?: string | null;
  bullets?: Array<{ id: string; text: string; sortOrder?: number }>;
};
type WorkspaceRun = { id: string; results: TailoredResult[] };
type Profile = {
  displayName?: string | null;
  email?: string | null;
  headline?: string | null;
  phone?: string | null;
  location?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
};

async function loadBankEntries(): Promise<BankEntry[]> {
  const items: BankEntry[] = [];
  let cursor: { updatedAt: string; id: string } | undefined;
  let pageCount = 0;
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) {
      params.set("cursorUpdated", cursor.updatedAt);
      params.set("cursorId", cursor.id);
    }
    const page = await readJson<{ items?: BankEntry[]; nextCursor?: { updatedAt: string; id: string } }>(
      await fetch(`/api/v1/bank/entries?${params.toString()}`, { cache: "no-store" }),
    );
    items.push(...(page.items || []));
    cursor = page.nextCursor;
    pageCount += 1;
  } while (cursor && pageCount < 50);
  return items;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "We couldn’t finish that step. Please try again.");
  }
  return payload as T;
}

function sectionType(entryType: string) {
  if (entryType === "project") return "projects";
  if (entryType === "education") return "education";
  if (entryType === "skill_group") return "skills";
  return "experience";
}

function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!(["ArrowLeft", "ArrowRight", "Home", "End"] as string[]).includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
  if (tabs.length < 2) return;
  event.preventDefault();
  const current = tabs.indexOf(event.currentTarget);
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}

export function AdaptiveResumeWorkspace() {
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>("write");
  const [mobilePane, setMobilePane] = useState<PreviewPane>("job");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobText, setJobText] = useState("");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [run, setRun] = useState<WorkspaceRun | null>(null);
  const [job, setJob] = useState<JobSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("Your resume preview will appear here.");

  const refreshJobs = async () => {
    const response = await fetch("/api/v1/jobs", { cache: "no-store" });
    const data = await readJson<JobSummary[]>(response);
    setJobs(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void refreshJobs().catch(() => undefined);
    void fetch("/api/v1/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setProfile(data); })
      .catch(() => undefined);

    // Auto-import pending job description from overview
    try {
      const pendingDesc = sessionStorage.getItem("pending_job_desc");
      if (pendingDesc && pendingDesc.trim()) {
        sessionStorage.removeItem("pending_job_desc");
        setJobText(pendingDesc);
        const titleMatch = pendingDesc.match(/(?:title|role|position|looking for a|seeking a)\s*:?\s*([A-Za-z0-9\s-]{4,40})/i);
        if (titleMatch) {
          setTitle(titleMatch[1].trim());
        }
      }
    } catch {
      // Ignore sessionStorage access errors
    }
  }, []);

  const currentResults = run?.results || [];
  const acceptedCount = currentResults.filter((result) => result.status === "accepted").length;
  const sourceByBulletId = useMemo(() => {
    const map = new Map<string, BankEntry>();
    for (const entry of bankEntries) {
      for (const bullet of entry.bullets || []) map.set(bullet.id, entry);
    }
    return map;
  }, [bankEntries]);

  const bulletOrderById = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of bankEntries) {
      (entry.bullets || []).forEach((bullet, idx) => {
        map.set(bullet.id, typeof bullet.sortOrder === "number" ? bullet.sortOrder : idx);
      });
    }
    return map;
  }, [bankEntries]);

  const buildResumeDocument = (): ResumeDoc => {
    const groups = new Map<string, { entry: BankEntry; bullets: Array<ResumeBulletDoc & { _vaultOrder: number; _relRank: number }> }>();
    const acceptedResults = currentResults.filter((item) => item.status === "accepted");

    acceptedResults.forEach((result, relIdx) => {
      const entry = sourceByBulletId.get(result.bulletId);
      if (!entry) return;
      const group = groups.get(entry.id) || { entry, bullets: [] };
      const sourceBulletId = result.sourceBulletIds?.[0] || result.bulletId;
      group.bullets.push({
        id: result.bulletId,
        text: result.rewrittenText,
        provenance: result.validatorStatus === "passed" ? "ai-rewrite" : "bank",
        sourceBulletIds: result.sourceBulletIds,
        sourceFactIds: result.sourceFactIds,
        validatorStatus: result.validatorStatus === "passed" ? "passed" : "not_applicable",
        _vaultOrder: bulletOrderById.get(sourceBulletId) ?? relIdx,
        _relRank: relIdx,
      });
      groups.set(entry.id, group);
    });

    const getOrderedGroupBullets = (
      bullets: Array<ResumeBulletDoc & { _vaultOrder: number; _relRank: number }>
    ): ResumeBulletDoc[] =>
      [...bullets]
        .sort((a, b) => a._vaultOrder - b._vaultOrder || a._relRank - b._relRank)
        .map(({ _vaultOrder: _vo, _relRank: _rr, ...rest }) => rest);

    const expGroups = [...groups.values()]
      .filter((g) => sectionType(g.entry.entryType) === "experience")
      .sort((a, b) => compareReverseChronological(a.entry, b.entry));

    const workspaceJdText = (job?.rawText || jobText || "").trim();
    const workspaceJdFit = workspaceJdText
      ? analyzeRoleFitAgainstVault(workspaceJdText, bankEntries)
      : { matchedSkills: [], missingSkills: [] };
    const workspaceJdKeywords = Array.from(
      new Set([...workspaceJdFit.matchedSkills, ...workspaceJdFit.missingSkills].filter(Boolean))
    );
    const workspaceRoleTitle = (job?.title || title || "").trim() || undefined;

    const projGroupsRaw = [...groups.values()]
      .filter((g) => sectionType(g.entry.entryType) === "projects")
      .map((g) => ({
        ...g,
        title: g.entry.title,
        descriptionContext: g.entry.descriptionContext,
        sortOrder: g.entry.sortOrder,
        orderedBullets: getOrderedGroupBullets(g.bullets),
      }));

    const projGroups = sortProjectsByConfidenceAndRelevance(
      projGroupsRaw.map((g) => ({
        ...g,
        bullets: g.orderedBullets.map((b, idx) => ({ id: b.id, text: b.text, sortOrder: idx })),
      })),
      workspaceJdKeywords,
      workspaceRoleTitle
    ).map((g, idx) => {
      const byText = new Map(g.orderedBullets.map((b) => [b.text.trim(), b]));
      const angle = selectProjectAnglePoints({
        title: g.entry.title,
        descriptionContext: g.entry.descriptionContext,
        bullets: g.orderedBullets.map((b, bIdx) => ({ id: b.id, text: b.text, sortOrder: bIdx })),
        jdKeywords: workspaceJdKeywords,
        jdTitle: workspaceRoleTitle,
        confidenceRank: typeof g.entry.sortOrder === "number" ? g.entry.sortOrder : idx,
        maxBullets: 2,
      });
      const selectedBullets: ResumeBulletDoc[] = angle.bullets.map((text, bIdx) => {
        const matched = byText.get(text.trim());
        if (matched) return matched;
        return {
          id: `${g.entry.id}_ctx_${bIdx}`,
          text,
          provenance: "bank",
          sourceBulletIds: [],
          sourceFactIds: [],
          validatorStatus: "not_applicable",
        };
      });
      return {
        entry: g.entry,
        confidenceRank: typeof g.entry.sortOrder === "number" ? g.entry.sortOrder : idx,
        selectedBullets,
      };
    });

    const eduEntries = bankEntries
      .filter((e) => e.entryType === "education")
      .sort(compareReverseChronological);

    const skillEntries = bankEntries.filter((e) => e.entryType === "skill_group");
    const certEntries = bankEntries.filter((e) => e.entryType === "certification");
    const awardEntries = bankEntries.filter((e) => e.entryType === "award");

    const topExperience = expGroups.map(({ entry, bullets }, idx) => ({
      id: entry.id,
      company: entry.organization || "",
      position: entry.title,
      startDate: entry.startDate || "",
      endDate: entry.endDate || null,
      isCurrent: Boolean(entry.isCurrent),
      location: entry.location || undefined,
      bullets: selectExperienceBulletsForRole({
        bullets: getOrderedGroupBullets(bullets),
        jdKeywords: workspaceJdKeywords,
        jdTitle: workspaceRoleTitle,
        maxBullets: idx <= 1 ? 4 : 3,
      }),
    }));

    const topProjects = projGroups.map(({ entry, confidenceRank, selectedBullets }) => ({
      id: entry.id,
      name: entry.title,
      role: entry.organization || undefined,
      description: entry.descriptionContext || undefined,
      confidenceRank,
      bullets: selectedBullets,
    }));

    const topEducation = eduEntries.map((entry) => ({
      id: entry.id,
      institution: entry.organization || entry.title,
      degree: entry.title,
      startDate: entry.startDate || "",
      endDate: entry.endDate || (entry.isCurrent ? "Present" : ""),
    }));

    const topSkills: Array<{ name: string; category?: string }> = [];
    const seenSkill = new Set<string>();
    for (const sGroup of skillEntries) {
      for (const b of sGroup.bullets || []) {
        for (const token of b.text.split(/[,•|\n]/).map((t) => t.trim()).filter(Boolean)) {
          const key = token.toLowerCase();
          if (seenSkill.has(key)) continue;
          seenSkill.add(key);
          topSkills.push({ name: token, category: sGroup.title });
        }
      }
    }

    const topCertifications = certEntries.map((c) => ({
      id: c.id,
      name: c.title,
      issuer: c.organization || "",
      issueDate: c.startDate || c.endDate || undefined,
    }));

    const topAwards = awardEntries.map((a) => ({
      id: a.id,
      name: a.title,
      issuer: normalizeDistinctAwardIssuer(a.title, a.organization || (a.bullets?.[0]?.text ?? "")),
      issueDate: a.startDate || a.endDate || undefined,
    }));

    const narrativeSummary = extractProfileSummaryFromEntries(bankEntries, profile.headline || "");

    const sectionGroups = {
      experience: expGroups.map(({ entry, bullets }): ResumeItemDoc => {
        const ordered = getOrderedGroupBullets(bullets);
        return {
          id: entry.id,
          sourceEntryId: entry.id,
          sourceBulletIds: ordered.flatMap((b) => b.sourceBulletIds),
          title: entry.title,
          organization: entry.organization || undefined,
          dates: { start: entry.startDate || undefined, end: entry.endDate || undefined, current: entry.isCurrent },
          location: entry.location || undefined,
          bullets: ordered,
        };
      }),
      projects: projGroups.map(({ entry, selectedBullets }): ResumeItemDoc => ({
        id: entry.id,
        sourceEntryId: entry.id,
        sourceBulletIds: selectedBullets.flatMap((b) => b.sourceBulletIds),
        title: entry.title,
        organization: entry.organization || undefined,
        bullets: selectedBullets,
      })),
      education: eduEntries.map((entry): ResumeItemDoc => ({
        id: entry.id,
        sourceEntryId: entry.id,
        sourceBulletIds: [],
        title: entry.title,
        organization: entry.organization || undefined,
        dates: { start: entry.startDate || undefined, end: entry.endDate || undefined, current: entry.isCurrent },
        location: entry.location || undefined,
        bullets: [],
      })),
      skills: skillEntries.map((entry): ResumeItemDoc => ({
        id: entry.id,
        sourceEntryId: entry.id,
        sourceBulletIds: (entry.bullets || []).map((b) => b.id),
        title: entry.title,
        bullets: (entry.bullets || []).map((b) => ({
          id: b.id,
          text: b.text,
          provenance: "bank",
          sourceBulletIds: [b.id],
          sourceFactIds: [],
          validatorStatus: "not_applicable",
        })),
      })),
    };

    const sections: ResumeSectionDoc[] = (["experience", "projects", "education", "skills"] as const).map(
      (type) => ({
        id: `section-${type}`,
        type,
        heading: type[0].toUpperCase() + type.slice(1),
        visible: sectionGroups[type].length > 0,
        items: sectionGroups[type],
      })
    );

    return {
      schemaVersion: 1,
      documentId: "",
      versionId: "",
      jobId: job?.id,
      profile: {
        name: profile.displayName || "",
        fullName: profile.displayName || "",
        headline: profile.headline || "",
        summary: narrativeSummary,
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        links: [
          ["GitHub", profile.githubUrl],
          ["LinkedIn", profile.linkedinUrl],
          ["Portfolio", profile.portfolioUrl],
        ].filter(([, url]) => Boolean(url)).map(([label, url]) => ({ label: label!, url: url! })),
      },
      sections,
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: topExperience,
      education: topEducation,
      skills: topSkills,
      projects: topProjects,
      certifications: topCertifications,
      awards: topAwards,
    };
  };

  const runTailorPipeline = async (directToDraft: boolean) => {
    setBusy(true);
    setError(null);
    setRun(null);
    setJob(null);
    setStep(directToDraft ? "Tailoring your draft…" : "Saving the job description…");
    try {
      const jobPayload = await readJson<{ job: JobSummary }>(await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, company: company.trim() || undefined, rawText: jobText.trim() }),
      }));
      const savedJob = jobPayload.job;
      setJob(savedJob);

      setStep("Analysing role requirements…");
      await readJson(await fetch(`/api/v1/jobs/${savedJob.id}/analyze`, { method: "POST" }));

      if (directToDraft) {
        setStep("Building your tailored draft…");
        const created = await readJson<{ id: string }>(await fetch("/api/v1/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${savedJob.title || "Target role"} resume`,
            jobId: savedJob.id,
          }),
        }));
        invalidateVaultCache();
        router.push(`/resumes/${created.id}/edit`);
        return;
      }

      setStep("Building a first draft from your records…");
      const [runResponse, entries] = await Promise.all([
        fetch(`/api/v1/jobs/${savedJob.id}/tailor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "full_resume" }),
        }),
        loadBankEntries(),
      ]);
      const nextRun = await readJson<WorkspaceRun>(runResponse);
      setBankEntries(entries);
      setRun(nextRun);
      setStep(nextRun.results.length ? "Review each line, then save your resume." : "No matching lines were found in your records yet.");
      setMobilePane("resume");
      void refreshJobs().catch(() => undefined);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "We couldn’t build the resume. Please try again.";
      setError(message);
      setStep("Your resume preview will appear here.");
    } finally {
      setBusy(false);
    }
  };

  const handleTailor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runTailorPipeline(true);
  };

  const updateResult = async (result: TailoredResult, decision: "accept" | "reject") => {
    if (!run) return;
    setError(null);
    try {
      const response = await fetch(`/api/v1/ai-runs/${run.id}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletId: result.bulletId }),
      });
      const updated = await readJson<WorkspaceRun>(response);
      setRun(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t update that line.");
    }
  };

  const handleSaveResume = async () => {
    if (!job || acceptedCount === 0) return;
    setSaving(true);
    setError(null);
    try {
      const created = await readJson<{ id: string }>(await fetch("/api/v1/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${job.title || "Target role"} resume`,
          jobId: job.id,
          initialDoc: buildResumeDocument(),
        }),
      }));
      invalidateVaultCache();
      router.push(`/resumes/${created.id}/edit`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t save this resume.");
    } finally {
      setSaving(false);
    }
  };

  const tabClass = (active: boolean) => `workspace-tab${active ? " is-active" : ""}`;

  return (
    <section className="adaptive-workspace" aria-labelledby="workspace-title">
      <div className="workspace-heading">
        <div>
          <h1 id="workspace-title">Start with the job.</h1>
          <p>Paste a job description. Your draft will use experience from your Data Bank, and you’ll review every line.</p>
        </div>
        <div className="workspace-heading-actions">
          <Link href="/bank/intake" className="workspace-secondary-link"><FileText aria-hidden="true" size={17} /> Upload a resume</Link>
          <Link href="/profile" className="workspace-secondary-link"><UserRound aria-hidden="true" size={16} /> Profile</Link>
          <Link href="/bank" className="workspace-bank-link">Open your Data Bank <ArrowUpRight aria-hidden="true" size={16} /></Link>
        </div>
      </div>

      <div className="workspace-top-tabs" role="tablist" aria-label="Resume workspace">
        <button id="workspace-write-tab" type="button" role="tab" aria-controls="workspace-write-panel" aria-selected={tab === "write"} tabIndex={tab === "write" ? 0 : -1} className={tabClass(tab === "write")} onKeyDown={moveTabFocus} onClick={() => setTab("write")}>Make a resume</button>
        <button id="workspace-history-tab" type="button" role="tab" aria-controls="workspace-history-panel" aria-selected={tab === "history"} tabIndex={tab === "history" ? 0 : -1} className={tabClass(tab === "history")} onKeyDown={moveTabFocus} onClick={() => { setTab("history"); void refreshJobs().catch(() => undefined); }}>Past jobs {jobs.length > 0 && <span className="workspace-tab-count">{jobs.length}</span>}</button>
      </div>

      {tab === "write" ? (
        <>
          <div id="workspace-write-panel" role="tabpanel" aria-labelledby="workspace-write-tab" className="workspace-write-panel">
          <div className="workspace-mobile-tabs" role="tablist" aria-label="Choose what to work on">
            <button id="job-pane-tab" type="button" role="tab" aria-selected={mobilePane === "job"} aria-controls="job-pane" tabIndex={mobilePane === "job" ? 0 : -1} className={tabClass(mobilePane === "job")} onKeyDown={moveTabFocus} onClick={() => setMobilePane("job")}>Job description</button>
            <button id="resume-pane-tab" type="button" role="tab" aria-selected={mobilePane === "resume"} aria-controls="resume-pane" tabIndex={mobilePane === "resume" ? 0 : -1} className={tabClass(mobilePane === "resume")} onKeyDown={moveTabFocus} onClick={() => setMobilePane("resume")}>Resume preview</button>
          </div>

          <div className="workspace-columns">
            <section id="job-pane" role="tabpanel" aria-labelledby="job-pane-tab" className={`workspace-pane job-pane${mobilePane === "job" ? " is-mobile-active" : ""}`} aria-label="Job description">
              <div className="workspace-pane-heading">
                <div>
                  <span className="workspace-pane-index">Start here</span>
                  <h2>Paste the job description</h2>
                </div>
                <ClipboardPaste size={18} aria-hidden="true" />
              </div>

              <form onSubmit={handleTailor} className="workspace-form">
                <div className="workspace-fields">
                  <label>
                    <span>Role title <small>optional</small></span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Product designer" maxLength={200} />
                  </label>
                  <label>
                    <span>Company <small>optional</small></span>
                    <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Where you’d work" maxLength={200} />
                  </label>
                </div>
                <label className="workspace-description-label">
                  <span>Job description</span>
                  <textarea value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Paste the responsibilities and qualifications here…" rows={14} maxLength={30000} required />
                </label>
                <div className="workspace-form-footer">
                  <span>{jobText.length.toLocaleString()} / 30,000</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="workspace-secondary-link"
                      disabled={busy || jobText.trim().length < 10}
                      onClick={() => void runTailorPipeline(false)}
                    >
                      Preview bullets first
                    </button>
                    <button className="workspace-primary-button" type="submit" disabled={busy || jobText.trim().length < 10}>
                      {busy ? <><LoaderCircle size={16} className="spin" aria-hidden="true" />{step}</> : <>Make my resume <ArrowUpRight size={16} aria-hidden="true" /></>}
                    </button>
                  </div>
                </div>
              </form>

              <div className="workspace-assurance"><ShieldCheck size={16} aria-hidden="true" /><span>Your draft uses experience already in your account. You review it before saving.</span></div>
              {error && <div className="workspace-error" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{error}</span></div>}
            </section>

            <section id="resume-pane" role="tabpanel" aria-labelledby="resume-pane-tab" className={`workspace-pane resume-pane${mobilePane === "resume" ? " is-mobile-active" : ""}`} aria-label="Resume preview">
              <div className="workspace-pane-heading resume-pane-heading">
                <div>
                  <span className="workspace-pane-index">Preview</span>
                  <h2>{run ? "Your first draft" : "Your resume takes shape here"}</h2>
                </div>
                {run && <span className="workspace-review-count">{acceptedCount} of {currentResults.length} approved</span>}
              </div>

              {!run ? (
                <div className="resume-empty-state">
                  <FileText className="resume-empty-icon" size={30} strokeWidth={1.5} aria-hidden="true" />
                  <h3>{step === "Your resume preview will appear here." ? "Your tailored draft will appear here." : step}</h3>
                  <p>Paste a job description to bring the most relevant parts of your experience forward.</p>
                  <div className="resume-empty-next"><span>New here?</span> Upload your current resume and review what gets added before you start.</div>
                  <Link href="/bank/intake" className="workspace-inline-link"><FileText size={16} aria-hidden="true" /> Upload an existing resume</Link>
                </div>
              ) : currentResults.length === 0 ? (
                <div className="resume-empty-state"><FileText size={28} aria-hidden="true" /><p>No matching lines yet.</p><small>Add relevant experience to your bank, then try another job description.</small><Link href="/bank/intake" className="workspace-inline-link">Add experience</Link></div>
              ) : (
                <div className="resume-preview-sheet">
                  <div className="resume-preview-profile">
                    <h3>{profile.displayName || "Your name"}</h3>
                    <p>{job?.title || "Role you’re applying for"}{job?.company ? ` at ${job.company}` : ""}</p>
                    {[profile.headline, profile.location, profile.email, profile.phone].filter(Boolean).join(" / ") && <span>{[profile.headline, profile.location, profile.email, profile.phone].filter(Boolean).join(" / ")}</span>}
                  </div>
                  {currentResults.map((result) => {
                    const entry = sourceByBulletId.get(result.bulletId);
                    const accepted = result.status === "accepted";
                    const rejected = result.status === "rejected";
                    return (
                      <article key={result.bulletId} className={`resume-line${accepted ? " is-approved" : ""}${rejected ? " is-rejected" : ""}`}>
                        <div className="resume-line-meta">
                        <span className="resume-source-mark"><span aria-hidden="true" />{entry ? `${entry.title}${entry.organization ? ` at ${entry.organization}` : ""}` : "From your experience"}</span>
                          <span className={`resume-line-status${result.validatorStatus === "passed" ? " is-verified" : ""}`}>
                            {result.validatorStatus === "passed" ? "Checked" : "Original wording"}
                          </span>
                        </div>
                        <p>{result.rewrittenText}</p>
                        <div className="resume-line-actions">
                          {accepted ? <span className="approved-label"><span aria-hidden="true">✓</span>Added to draft</span> : rejected ? <span className="rejected-label">Left out</span> : <>
                            <button type="button" className="line-approve" onClick={() => void updateResult(result, "accept")}>Use this line</button>
                            <button type="button" className="line-reject" onClick={() => void updateResult(result, "reject")}>Leave it out</button>
                          </>}
                        </div>
                      </article>
                    );
                  })}
                  <div className="resume-preview-footer"><span>Every line comes from your experience.</span><button type="button" onClick={() => setRun(null)} className="workspace-reset-button"><RotateCcw size={14} aria-hidden="true" />Start over</button></div>
                </div>
              )}

              {run && acceptedCount > 0 && <div className="workspace-save-row"><button type="button" className="workspace-primary-button" onClick={() => void handleSaveResume()} disabled={saving}>{saving ? <><LoaderCircle size={16} className="spin" aria-hidden="true" />Saving resume…</> : <>Open this resume in the editor <ArrowUpRight size={16} aria-hidden="true" /></>}</button><p>You can make final edits before exporting.</p></div>}
            </section>
          </div>
          </div>
        </>
      ) : (
        <section id="workspace-history-panel" role="tabpanel" aria-labelledby="workspace-history-tab" className="workspace-history" aria-label="Past job descriptions">
          <div className="workspace-history-heading"><div><h2>Pick up where you left off</h2><p>Open a saved job description to review its match and draft.</p></div><button type="button" className="workspace-text-button" onClick={() => setTab("write")}>New resume</button></div>
          {jobs.length === 0 ? <div className="workspace-history-empty">No saved jobs yet. Paste a description to begin.</div> : <ul>{jobs.map((item) => <li key={item.id}><button type="button" onClick={() => router.push(`/jobs/${item.id}`)}><span><strong>{item.title || "Untitled role"}</strong><small>{item.company || "Company not added"}</small></span><span className="history-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}<ArrowUpRight size={16} aria-hidden="true" /></span></button></li>)}</ul>}
        </section>
      )}
    </section>
  );
}
