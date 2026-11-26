import { ResumeDoc, ResumeProject, ResumeExperience, ResumeCertification } from "@/types/resume";
import { sortResumeDocChronologically } from "@/lib/utils/resumeOrderUtils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats ISO dates (`YYYY-MM-DD` / `YYYY-MM`) into concise resume dates (`Jul 2026`),
 * while preserving readable strings like `Present`, `May 2026`, or `2024`.
 */
export function formatResumeDate(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (/^present$/i.test(trimmed)) return "Present";

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTHS[monthIdx]} ${year}`;
    }
    return year;
  }
  return trimmed;
}

function scoreTextRelevance(text: string, jdKeywords: string[]): number {
  if (jdKeywords.length === 0) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of jdKeywords) {
    if (kw && lower.includes(kw.toLowerCase())) hits += 1;
  }
  return hits;
}

/**
 * Estimates total rendered height on an A4 single sheet (210mm x 297mm) using
 * character count plus per-item header/margin line overhead.
 */
export function estimateA4DensityUnits(doc: ResumeDoc): number {
  let units = 160; // Header + contact line
  const summary = (doc.profile?.summary || "").trim();
  const headline = (doc.profile?.headline || "").trim();
  if (summary && summary.toLowerCase() !== headline.toLowerCase()) {
    units += Math.max(85, summary.length) + 70;
  }

  for (const exp of doc.experience || []) {
    units += 120; // Position | Company | Dates header line
    for (const b of exp.bullets || []) {
      units += Math.max(75, b.text.length + 20);
    }
  }

  for (const proj of doc.projects || []) {
    units += 110;
    if (proj.description) units += Math.min(100, proj.description.length);
    for (const b of proj.bullets || []) {
      units += Math.max(75, b.text.length + 20);
    }
  }

  for (const edu of doc.education || []) {
    units += 115 + (edu.institution?.length || 0);
  }

  const awardsAndCerts = (doc.awards?.length || 0) + (doc.certifications?.length || 0);
  if (awardsAndCerts > 0) {
    units += 70 + awardsAndCerts * 75;
  }

  if ((doc.skills?.length || 0) > 0) {
    const categories = new Set((doc.skills || []).map((s) => s.category || "General"));
    units += 70 + categories.size * 75;
  }

  return units;
}

const TARGET_A4_UNITS = 2950;

/**
 * Shapes a generated/edited ResumeDoc to fit comfortably on a single A4 page (`210mm x 297mm`):
 * - Maintains reverse-chronological order for Experience & Education
 * - Preserves user's curated bullet order within each entry
 * - Retains awards/hackathon wins & certifications
 * - Prunes lowest-relevance overflow projects/excess trailing bullets only when exceeding 1 A4 page
 */
export function budgetResumeForOnePageA4(
  inputDoc: ResumeDoc,
  options?: { jdKeywords?: string[] }
): ResumeDoc {
  const ordered = sortResumeDocChronologically({
    ...inputDoc,
    page: {
      size: inputDoc.page?.size || "A4",
      targetPages: 1,
    },
  });

  const jdKeywords = (options?.jdKeywords || []).filter((k) => k.length > 1);

  // Drop redundant summary when it just duplicates headline
  const headline = (ordered.profile?.headline || "").trim();
  const summary = (ordered.profile?.summary || "").trim();
  const cleanedSummary =
    summary && headline && summary.toLowerCase() === headline.toLowerCase()
      ? ""
      : summary;

  let experience: ResumeExperience[] = (ordered.experience || []).slice(0, 3).map((e) => ({
    ...e,
    bullets: [...(e.bullets || [])],
  }));

  // Rank projects by JD keyword overlap while preserving tie order
  const rawProjects = (ordered.projects || []).map((p, idx) => {
    const blob = [p.name, p.role || "", p.description || "", ...(p.bullets || []).map((b) => b.text)].join(" ");
    return {
      proj: {
        ...p,
        bullets: [...(p.bullets || [])],
      },
      score: scoreTextRelevance(blob, jdKeywords),
      idx,
    };
  });
  if (jdKeywords.length > 0) {
    rawProjects.sort((a, b) => b.score - a.score || a.idx - b.idx);
  }
  let projects: ResumeProject[] = rawProjects.slice(0, 3).map((r) => r.proj);

  const awards: ResumeCertification[] = [...(ordered.awards || [])];
  const certifications: ResumeCertification[] = [...(ordered.certifications || [])];

  const makeCandidate = (): ResumeDoc => ({
    ...ordered,
    profile: {
      ...ordered.profile,
      summary: cleanedSummary,
    },
    experience,
    projects,
    awards,
    certifications,
    sections: (ordered.sections || []).map((sec) => {
      if (sec.type === "experience") {
        return {
          ...sec,
          items: experience.map((e) => ({
            id: e.id,
            sourceEntryId: e.id,
            sourceBulletIds: e.bullets.flatMap((b) => b.sourceBulletIds || [b.id]),
            title: e.position,
            organization: e.company,
            dates: { start: e.startDate, end: e.endDate || undefined, current: e.isCurrent },
            location: e.location,
            bullets: e.bullets,
          })),
        };
      }
      if (sec.type === "projects") {
        return {
          ...sec,
          items: projects.map((p) => ({
            id: p.id,
            sourceEntryId: p.id,
            sourceBulletIds: p.bullets.flatMap((b) => b.sourceBulletIds || [b.id]),
            title: p.name,
            organization: p.role,
            bullets: p.bullets,
          })),
        };
      }
      return sec;
    }),
  });

  // Pass 1: Remove redundant prose description on projects that already have achievement bullets
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS) {
    projects = projects.map((p) =>
      p.bullets.length > 0 ? { ...p, description: undefined } : p
    );
  }

  // Pass 2: Trim secondary experiences to max 3 bullets (preserving first curated bullets)
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS) {
    experience = experience.map((e, idx) =>
      e.bullets.length > (idx === 0 ? 4 : 3)
        ? { ...e, bullets: e.bullets.slice(0, idx === 0 ? 4 : 3) }
        : e
    );
  }

  // Pass 3: Trim project bullets to 2 each
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS) {
    projects = projects.map((p) =>
      p.bullets.length > 2 ? { ...p, bullets: p.bullets.slice(0, 2) } : p
    );
  }

  // Pass 4: Trim primary experience from 5 -> 3 bullets if still overflowing
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS) {
    experience = experience.map((e) =>
      e.bullets.length > 3 ? { ...e, bullets: e.bullets.slice(0, 3) } : e
    );
  }

  // Pass 5: If 3+ projects still overflow A4, keep the top 2 most role-relevant projects
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS && projects.length > 2) {
    projects = projects.slice(0, 2);
  }

  // Pass 6: Final gentle cap to 2 bullets on older experiences if still tight
  if (estimateA4DensityUnits(makeCandidate()) > TARGET_A4_UNITS) {
    experience = experience.map((e, idx) =>
      idx > 0 && e.bullets.length > 2 ? { ...e, bullets: e.bullets.slice(0, 2) } : e
    );
  }

  return makeCandidate();
}
