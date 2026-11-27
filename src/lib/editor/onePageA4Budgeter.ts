import { ResumeDoc, ResumeProject, ResumeExperience, ResumeCertification } from "@/types/resume";
import { sortResumeDocChronologically } from "@/lib/utils/resumeOrderUtils";
import {
  confidenceRankToBonus,
  normalizeDistinctAwardIssuer,
  selectExperienceBulletsForRole,
} from "@/lib/tailoring/projectAngleSelector";

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

function wrappedLineUnits(text: string, charsPerLine = 92, perLine = 46): number {
  const clean = (text || "").trim();
  if (!clean) return 0;
  return Math.max(1, Math.ceil((clean.length + 4) / charsPerLine)) * perLine;
}

/**
 * Estimates total rendered height on an A4 single sheet (210mm x 297mm) using
 * wrapped line counts plus per-item header/margin overhead.
 */
export function estimateA4DensityUnits(doc: ResumeDoc): number {
  let units = 155; // Name, headline, contact line
  const summary = (doc.profile?.summary || "").trim();
  const headline = (doc.profile?.headline || "").trim();
  if (summary && summary.toLowerCase() !== headline.toLowerCase()) {
    units += 55 + wrappedLineUnits(summary, 96, 46);
  }

  if ((doc.experience?.length || 0) > 0) units += 55;
  for (const exp of doc.experience || []) {
    units += 95; // Position + Company + Dates lines + spacing
    for (const b of exp.bullets || []) {
      units += wrappedLineUnits(b.text, 90, 46) + 6;
    }
  }

  if ((doc.projects?.length || 0) > 0) units += 55;
  for (const proj of doc.projects || []) {
    units += 68;
    if (proj.description) units += wrappedLineUnits(proj.description, 92, 42);
    for (const b of proj.bullets || []) {
      units += wrappedLineUnits(b.text, 90, 46) + 6;
    }
  }

  if ((doc.education?.length || 0) > 0) units += 55;
  for (const edu of doc.education || []) {
    units += 85 + wrappedLineUnits(`${edu.institution || ""} ${edu.degree || ""}`, 90, 44);
  }

  const awardsAndCerts = (doc.awards?.length || 0) + (doc.certifications?.length || 0);
  if (awardsAndCerts > 0) {
    units += 55 + awardsAndCerts * 48;
  }

  if ((doc.skills?.length || 0) > 0) {
    const grouped = new Map<string, string[]>();
    for (const s of doc.skills || []) {
      const cat = s.category || "General";
      const list = grouped.get(cat) || [];
      list.push(s.name);
      grouped.set(cat, list);
    }
    units += 55;
    for (const [cat, items] of grouped.entries()) {
      units += wrappedLineUnits(`${cat}: ${items.join(", ")}`, 96, 46);
    }
  }

  return units;
}

const DEFAULT_TARGET_A4_UNITS = 3250;
const DENSE_TARGET_A4_UNITS = 4250;

/**
 * Shapes a generated/edited ResumeDoc to fit comfortably on a single A4 page (`210mm x 297mm`)
 * while utilizing full page space without leaving large bottom gaps:
 * - Maintains reverse-chronological order for Experience & Education unless user reordered manually
 * - Prioritizes technical/measured experience bullets & user project confidence rank
 * - Retains Professional Summary, Skills at top, 3 projects (when space allows), and awards/certifications
 */
export function budgetResumeForOnePageA4(
  inputDoc: ResumeDoc,
  options?: { jdKeywords?: string[]; preserveOrder?: boolean }
): ResumeDoc {
  const isDenseTemplate = inputDoc.template?.id === "dense-single-page";
  const targetUnits = isDenseTemplate ? DENSE_TARGET_A4_UNITS : DEFAULT_TARGET_A4_UNITS;
  const preserveManualOrder =
    Boolean(options?.preserveOrder) || Boolean(inputDoc.metadata?.preserveManualOrder);

  const ordered = preserveManualOrder
    ? {
        ...inputDoc,
        page: {
          size: inputDoc.page?.size || "A4",
          targetPages: 1,
        },
      }
    : sortResumeDocChronologically({
        ...inputDoc,
        page: {
          size: inputDoc.page?.size || "A4",
          targetPages: 1,
        },
      });

  const jdKeywords = (options?.jdKeywords || []).filter((k) => k.length > 1);

  // Drop redundant summary only when it literally duplicates the headline
  const headline = (ordered.profile?.headline || "").trim();
  const summary = (ordered.profile?.summary || "").trim();
  const cleanedSummary =
    summary && headline && summary.toLowerCase() === headline.toLowerCase()
      ? ""
      : summary;

  let experience: ResumeExperience[] = (ordered.experience || []).slice(0, 3).map((e, idx) => ({
    ...e,
    bullets: selectExperienceBulletsForRole({
      bullets: e.bullets || [],
      jdKeywords,
      maxBullets: isDenseTemplate ? (idx <= 1 ? 4 : 3) : idx <= 1 ? 3 : 2,
    }),
  }));

  // Rank projects by JD keyword overlap + moderated confidence rank unless user reordered manually
  const rawProjects = (ordered.projects || []).map((p, idx) => {
    const blob = [p.name, p.role || "", p.description || "", ...(p.bullets || []).map((b) => b.text)].join(" ");
    const relHits = scoreTextRelevance(blob, jdKeywords);
    const relevanceScore = relHits * 14;
    const rawConf = confidenceRankToBonus(p.confidenceRank);
    const confidenceBonus = jdKeywords.length > 0 && relHits === 0 ? Math.floor(rawConf * 0.2) : rawConf;
    return {
      proj: {
        ...p,
        bullets: [...(p.bullets || [])],
      },
      score: relevanceScore + confidenceBonus,
      hasConfidenceRank: typeof p.confidenceRank === "number",
      idx,
    };
  });
  if (!preserveManualOrder && (jdKeywords.length > 0 || rawProjects.some((r) => r.hasConfidenceRank))) {
    rawProjects.sort((a, b) => b.score - a.score || a.idx - b.idx);
  }
  let projects: ResumeProject[] = rawProjects.slice(0, 3).map((r) => r.proj);

  const awards: ResumeCertification[] = (ordered.awards || []).map((a) => ({
    ...a,
    issuer: normalizeDistinctAwardIssuer(a.name, a.issuer),
  }));
  const certifications: ResumeCertification[] = [...(ordered.certifications || [])];

  const defaultSectionOrder = ["profile", "skills", "experience", "projects", "education", "certifications"];
  const resolvedSectionOrder =
    ordered.template?.theme?.sectionOrder && ordered.template.theme.sectionOrder.length > 0
      ? ordered.template.theme.sectionOrder
      : defaultSectionOrder;

  const makeCandidate = (): ResumeDoc => ({
    ...ordered,
    profile: {
      ...ordered.profile,
      summary: cleanedSummary,
    },
    template: {
      ...ordered.template,
      theme: {
        ...ordered.template?.theme,
        sectionOrder: resolvedSectionOrder,
      },
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
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    projects = projects.map((p) =>
      p.bullets.length > 0 ? { ...p, description: undefined } : p
    );
  }

  // Pass 2: Trim secondary experiences to max 3 bullets, keeping primary roles rich (4 bullets)
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    experience = experience.map((e, idx) =>
      e.bullets.length > (idx <= 1 ? 4 : 3)
        ? { ...e, bullets: e.bullets.slice(0, idx <= 1 ? 4 : 3) }
        : e
    );
  }

  // Pass 3: Trim project bullets to 3 each (keeping stack line + 2 bullets when applicable)
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    projects = projects.map((p) =>
      p.bullets.length > 3 ? { ...p, bullets: p.bullets.slice(0, 3) } : p
    );
  }

  // Pass 4: Trim primary experience from 4 -> 3 bullets & project bullets to 2 if still overflowing
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    experience = experience.map((e) =>
      e.bullets.length > 3 ? { ...e, bullets: e.bullets.slice(0, 3) } : e
    );
  }
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    projects = projects.map((p) =>
      p.bullets.length > 2 ? { ...p, bullets: p.bullets.slice(0, 2) } : p
    );
  }

  // Pass 5: Gentle cap to 2 bullets on older experiences before dropping a 3rd project
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits) {
    experience = experience.map((e, idx) =>
      idx > 0 && e.bullets.length > 2 ? { ...e, bullets: e.bullets.slice(0, 2) } : e
    );
  }

  // Pass 6: Only if 3+ projects still overflow A4, keep the top 2 most role-relevant / confident projects
  if (estimateA4DensityUnits(makeCandidate()) > targetUnits && projects.length > 2) {
    projects = projects.slice(0, 2);
  }

  return makeCandidate();
}
