import {
  ResumeDoc,
  ResumeExperience,
  ResumeEducation,
  ResumeSkill,
  ResumeProject,
  ResumeCertification,
  ResumeSectionDoc,
  ResumeBulletDoc,
} from "@/types/resume";

export interface NormalizedCustomSection {
  id: string;
  type: string;
  heading: string;
  items: ResumeSectionDoc["items"];
}

export interface NormalizedExportResume {
  candidateName: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: Array<{ label: string; url: string }>;
  summary?: string;
  pageSize: "A4" | "LETTER";
  orderedSectionTypes: string[];
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  awards: ResumeCertification[];
  extraSections: NormalizedCustomSection[];
}

const DEFAULT_ORDER = ["skills", "experience", "projects", "education", "awards", "certifications"];

function toBulletDocs(rawBullets: unknown): ResumeBulletDoc[] {
  if (!Array.isArray(rawBullets)) return [];
  return rawBullets.map((b, idx) => {
    if (typeof b === "string") {
      return {
        id: `b_norm_${idx}`,
        text: b,
        provenance: "bank" as const,
        sourceBulletIds: [],
        sourceFactIds: [],
        validatorStatus: "not_applicable" as const,
      };
    }
    return b as ResumeBulletDoc;
  });
}

function findSection(doc: ResumeDoc, types: string[]): ResumeSectionDoc | undefined {
  const sections = doc.sections || [];
  return sections.find((s) => types.includes(s.type.toLowerCase()));
}

function isSectionVisible(doc: ResumeDoc, types: string[]): boolean {
  const sec = findSection(doc, types);
  return sec ? sec.visible !== false : true;
}

/**
 * Resolves a canonical ResumeDoc across both top-level arrays and doc.sections[],
 * respecting sectionOrder and per-section visibility toggles.
 */
export function normalizeResumeForExport(doc: ResumeDoc): NormalizedExportResume {
  const profile = doc.profile || { name: "", links: [] };
  const candidateName = profile.fullName || profile.name || "Resume";
  const pageSize: "A4" | "LETTER" = doc.page?.size === "A4" ? "A4" : "LETTER";

  // 1. Experience
  const expSec = findSection(doc, ["experience"]);
  let experiences: ResumeExperience[] = [];
  if (isSectionVisible(doc, ["experience"])) {
    if (doc.experience && doc.experience.length > 0) {
      experiences = doc.experience;
    } else if (expSec?.items?.length) {
      experiences = expSec.items.map((it) => ({
        id: it.id,
        company: it.organization || "",
        position: it.title || "",
        startDate: it.dates?.start || "",
        endDate: it.dates?.end || null,
        isCurrent: it.dates?.current || false,
        location: it.location,
        bullets: toBulletDocs(it.bullets),
      }));
    }
  }

  // 2. Education
  const eduSec = findSection(doc, ["education"]);
  let educations: ResumeEducation[] = [];
  if (isSectionVisible(doc, ["education"])) {
    if (doc.education && doc.education.length > 0) {
      educations = doc.education;
    } else if (eduSec?.items?.length) {
      educations = eduSec.items.map((it) => ({
        id: it.id,
        institution: it.organization || it.title || "",
        degree: it.title || "",
        field: undefined,
        startDate: it.dates?.start || "",
        endDate: it.dates?.end || undefined,
      }));
    }
  }

  // 3. Skills
  const skillSec = findSection(doc, ["skills", "skill_group"]);
  let skills: ResumeSkill[] = [];
  if (isSectionVisible(doc, ["skills", "skill_group"])) {
    if (doc.skills && doc.skills.length > 0) {
      skills = doc.skills;
    } else if (skillSec?.items?.length) {
      const parsed: ResumeSkill[] = [];
      for (const item of skillSec.items) {
        const category = item.title || undefined;
        for (const b of toBulletDocs(item.bullets)) {
          for (const token of b.text.split(/[,•|]/).map((t) => t.trim()).filter(Boolean)) {
            parsed.push({ name: token, category });
          }
        }
      }
      skills = parsed;
    }
  }

  // 4. Projects
  const projSec = findSection(doc, ["projects", "project"]);
  let projects: ResumeProject[] = [];
  if (isSectionVisible(doc, ["projects", "project"])) {
    if (doc.projects && doc.projects.length > 0) {
      projects = doc.projects;
    } else if (projSec?.items?.length) {
      projects = projSec.items.map((it) => ({
        id: it.id,
        name: it.title || "",
        role: it.organization || undefined,
        bullets: toBulletDocs(it.bullets),
      }));
    }
  }

  // 5. Certifications
  const certSec = findSection(doc, ["certifications", "certification"]);
  let certifications: ResumeCertification[] = [];
  if (isSectionVisible(doc, ["certifications", "certification"])) {
    if (doc.certifications && doc.certifications.length > 0) {
      certifications = doc.certifications;
    } else if (certSec?.items?.length) {
      certifications = certSec.items.map((it) => ({
        id: it.id,
        name: it.title || "",
        issuer: it.organization || "",
        issueDate: it.dates?.start || it.dates?.end || undefined,
      }));
    }
  }

  // 6. Awards / Achievements
  const awardSec = findSection(doc, ["awards", "award"]);
  let awards: ResumeCertification[] = [];
  if (isSectionVisible(doc, ["awards", "award"])) {
    if (doc.awards && doc.awards.length > 0) {
      awards = doc.awards;
    } else if (awardSec?.items?.length) {
      awards = awardSec.items.map((it) => ({
        id: it.id,
        name: it.title || "",
        issuer: it.organization || "",
        issueDate: it.dates?.start || it.dates?.end || undefined,
      }));
    }
  }

  // 7. Extra custom sections (publications, volunteer, custom)
  const knownTypes = new Set([
    "profile",
    "experience",
    "education",
    "skills",
    "skill_group",
    "projects",
    "project",
    "awards",
    "award",
    "certifications",
    "certification",
  ]);
  const extraSections: NormalizedCustomSection[] = (doc.sections || [])
    .filter((s) => s.visible !== false && !knownTypes.has(s.type.toLowerCase()) && (s.items?.length || 0) > 0)
    .map((s) => ({
      id: s.id,
      type: s.type.toLowerCase(),
      heading: s.heading || s.type,
      items: s.items || [],
    }));

  // Build ordered section list respecting template.theme.sectionOrder
  const themeOrder = (doc.template?.theme?.sectionOrder || []).filter((t) => t !== "profile");
  const allCandidateTypes = [
    ...themeOrder,
    ...DEFAULT_ORDER.filter((t) => !themeOrder.includes(t)),
    ...extraSections.map((s) => s.type).filter((t) => !themeOrder.includes(t)),
  ];

  return {
    candidateName,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    links: (profile.links || []).filter((l) => Boolean(l?.url)),
    summary: isSectionVisible(doc, ["profile"]) ? profile.summary : undefined,
    pageSize,
    orderedSectionTypes: allCandidateTypes,
    experiences,
    educations,
    skills,
    projects,
    certifications,
    awards,
    extraSections,
  };
}
