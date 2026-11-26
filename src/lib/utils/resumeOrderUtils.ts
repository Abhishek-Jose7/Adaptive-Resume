import { BankEntry } from "@/types/bank";
import { ResumeDoc, ResumeEducation, ResumeExperience } from "@/types/resume";

const PRESENT_VALUE = 9999_12_31;

/**
 * Converts dates such as "2026-05-01", "2026-05", "May 2026", "2024", or "Present"
 * into a comparable YYYYMMDD integer (0 if missing/unparseable).
 */
export function parseChronoScore(dateStr?: string | null, isCurrent?: boolean): number {
  if (isCurrent) return PRESENT_VALUE;
  if (!dateStr) return 0;

  const trimmed = dateStr.trim();
  if (!trimmed) return 0;
  if (/^(present|current|now|ongoing)$/i.test(trimmed)) return PRESENT_VALUE;

  const isoMatch = trimmed.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = isoMatch[2] ? Number(isoMatch[2]) : 12;
    const day = isoMatch[3] ? Number(isoMatch[3]) : 28;
    return year * 10000 + month * 100 + day;
  }

  const yearMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const lower = trimmed.toLowerCase();
    const monthIdx = months.findIndex((m) => lower.includes(m));
    const month = monthIdx >= 0 ? monthIdx + 1 : 12;
    return year * 10000 + month * 100 + 28;
  }

  return 0;
}

export interface ChronoSortableItem {
  isCurrent?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder?: number;
}

/**
 * Reverse-chronological comparator:
 * 1) Active / "Present" entries on top
 * 2) Latest end date descending
 * 3) Latest start date descending
 * 4) Explicit sortOrder ascending
 */
export function compareReverseChronological<T extends ChronoSortableItem>(a: T, b: T): number {
  const aCurr = a.isCurrent ? 1 : 0;
  const bCurr = b.isCurrent ? 1 : 0;
  if (aCurr !== bCurr) return bCurr - aCurr;

  const aEnd = parseChronoScore(a.endDate, a.isCurrent);
  const bEnd = parseChronoScore(b.endDate, b.isCurrent);
  if (aEnd !== bEnd) return bEnd - aEnd;

  const aStart = parseChronoScore(a.startDate, false);
  const bStart = parseChronoScore(b.startDate, false);
  if (aStart !== bStart) return bStart - aStart;

  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

export function sortBankEntriesChronologically(entries: BankEntry[]): BankEntry[] {
  return [...entries].sort(compareReverseChronological);
}

export function sortResumeExperiences(experiences: ResumeExperience[]): ResumeExperience[] {
  return [...experiences].sort((a, b) =>
    compareReverseChronological(
      { isCurrent: a.isCurrent, startDate: a.startDate, endDate: a.endDate },
      { isCurrent: b.isCurrent, startDate: b.startDate, endDate: b.endDate }
    )
  );
}

export function sortResumeEducations(educations: ResumeEducation[]): ResumeEducation[] {
  return [...educations].sort((a, b) =>
    compareReverseChronological(
      { startDate: a.startDate, endDate: a.endDate },
      { startDate: b.startDate, endDate: b.endDate }
    )
  );
}

export function sortResumeDocChronologically(doc: ResumeDoc): ResumeDoc {
  const sortedExperience = doc.experience ? sortResumeExperiences(doc.experience) : undefined;
  const sortedEducation = doc.education ? sortResumeEducations(doc.education) : undefined;

  const sortedSections = (doc.sections || []).map((sec) => {
    if (sec.type === "experience" || sec.type === "education") {
      return {
        ...sec,
        items: [...(sec.items || [])].sort((a, b) =>
          compareReverseChronological(
            {
              isCurrent: a.dates?.current,
              startDate: a.dates?.start,
              endDate: a.dates?.end,
            },
            {
              isCurrent: b.dates?.current,
              startDate: b.dates?.start,
              endDate: b.dates?.end,
            }
          )
        ),
      };
    }
    return sec;
  });

  return {
    ...doc,
    ...(sortedExperience ? { experience: sortedExperience } : {}),
    ...(sortedEducation ? { education: sortedEducation } : {}),
    sections: sortedSections,
  };
}
