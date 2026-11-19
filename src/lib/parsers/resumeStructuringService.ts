import crypto from "crypto";
import { StagedItemInput } from "@/lib/repositories/importRepository";

export interface ParsedBulletFact {
  factType: "metric" | "tool" | "technology" | "scope" | "role" | "outcome" | "date" | "other";
  factKey: string;
  valueText: string;
  valueNumber?: number;
  metricKind?: "percent" | "currency" | "count" | "duration" | "scale";
}

export interface StructuredResumeSection {
  entryType: "profile" | "experience" | "education" | "project" | "skill_group" | "certification" | "award" | "volunteer" | "custom";
  title: string;
  organization?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  descriptionContext?: string | null;
  bullets: string[];
  facts?: ParsedBulletFact[];
  confidence: number;
  rawSnippet: string;
}

export class ResumeStructuringService {
  /**
   * Deterministically segments raw resume text into structured Data Bank entries
   * Works completely offline with $0 spend and zero external API dependencies.
   */
  static structureResumeText(rawText: string, sourceLabel: string = "Uploaded Resume"): StructuredResumeSection[] {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    const sections: Array<{ heading: string; lines: string[] }> = [];
    let currentHeading = "PROFILE";
    let currentLines: string[] = [];

    const sectionHeadingRegex = /^(?:professional\s+summary|career\s+summary|executive\s+summary|summary|profile|about\s*me|work\s*experience|experience|employment(?:\s*history)?|career\s+history|professional\s*experience|education|academic(?:\s*history)?|projects|technical\s*projects|open\s*source|skills|technical\s*skills|core\s+competencies|competencies|certifications?|licenses?|awards?|honors?|publications?|volunteering|volunteer(?:\s*work)?)(?:\s*[:—–-])?$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check if line looks like a section header (short, matches section keywords, or normal-case)
      const isHeaderCandidate = line.length < 40 && (sectionHeadingRegex.test(line) || (line === line.toUpperCase() && line.length > 3 && line.length < 30));

      if (isHeaderCandidate && sectionHeadingRegex.test(line)) {
        if (currentLines.length > 0) {
          sections.push({ heading: currentHeading, lines: currentLines });
          currentLines = [];
        }
        currentHeading = line.toUpperCase();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({ heading: currentHeading, lines: currentLines });
    }

    const structuredResults: StructuredResumeSection[] = [];

    for (const section of sections) {
      const heading = section.heading.toUpperCase();
      const secLines = section.lines;

      if (/SUMMARY|PROFILE|ABOUT/i.test(heading)) {
        const summaryText = secLines.join(" ");
        structuredResults.push({
          entryType: "profile",
          title: "Professional Summary",
          organization: null,
          descriptionContext: summaryText,
          bullets: [summaryText],
          confidence: 0.95,
          rawSnippet: summaryText.substring(0, 200),
        });
      } else if (/EXPERIENCE|EMPLOYMENT/i.test(heading)) {
        const expEntries = this.parseExperienceBlocks(secLines);
        structuredResults.push(...expEntries);
      } else if (/EDUCATION|ACADEMIC/i.test(heading)) {
        const eduEntries = this.parseEducationBlocks(secLines);
        structuredResults.push(...eduEntries);
      } else if (/PROJECT/i.test(heading)) {
        const projEntries = this.parseProjectBlocks(secLines);
        structuredResults.push(...projEntries);
      } else if (/SKILL/i.test(heading)) {
        const skillEntries = this.parseSkillBlocks(secLines);
        structuredResults.push(...skillEntries);
      } else if (/CERTIF/i.test(heading)) {
        const certEntries = this.parseCertificationBlocks(secLines);
        structuredResults.push(...certEntries);
      } else if (/AWARD|HONOR/i.test(heading)) {
        for (const line of secLines) {
          structuredResults.push({
            entryType: "award",
            title: line.replace(/^[•\-\*]\s*/, ""),
            bullets: [line.replace(/^[•\-\*]\s*/, "")],
            confidence: 0.9,
            rawSnippet: line,
          });
        }
      } else if (/VOLUNTEER/i.test(heading)) {
        structuredResults.push({
          entryType: "volunteer",
          title: secLines[0] || "Volunteer Work",
          organization: secLines[1] || null,
          bullets: secLines.slice(1).map((l) => l.replace(/^[•\-\*]\s*/, "")),
          confidence: 0.85,
          rawSnippet: secLines.join("\n").substring(0, 200),
        });
      } else {
        // Fallback: Custom section
        structuredResults.push({
          entryType: "custom",
          title: section.heading,
          bullets: secLines.map((l) => l.replace(/^[•\-\*]\s*/, "")),
          confidence: 0.8,
          rawSnippet: secLines.join("\n").substring(0, 200),
        });
      }
    }

    // If nothing parsed into sections, fall back to heuristic chunks
    if (structuredResults.length === 0 && lines.length > 0) {
      structuredResults.push({
        entryType: "experience",
        title: lines[0] || "Imported Experience",
        organization: sourceLabel,
        bullets: lines.slice(1, 15).map((l) => l.replace(/^[•\-\*]\s*/, "")),
        confidence: 0.8,
        rawSnippet: lines.slice(0, 10).join("\n"),
      });
    }

    return structuredResults;
  }

  /**
   * Parses work experience blocks
   */
  private static parseExperienceBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    let currentRole: {
      title: string;
      organization?: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      bullets: string[];
      rawLines: string[];
    } | null = null;

    const datePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b|present|current)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[•\-\*]\s+/.test(line);
      const dateMatch = line.match(datePattern);

      if (!isBullet) {
        // If currentRole exists without dates and this line is primarily a date, attach it
        if (currentRole && !currentRole.startDate && dateMatch && line.replace(datePattern, "").trim().length < 15) {
          currentRole.startDate = dateMatch[2];
          currentRole.endDate = dateMatch[4]?.toLowerCase() === "present" ? undefined : dateMatch[4];
          currentRole.isCurrent = /present|current/i.test(dateMatch[4] || "");
          currentRole.rawLines.push(line);
          continue;
        }

        // Start a new role block
        if (currentRole && currentRole.bullets.length > 0) {
          results.push(this.formatExperienceRole(currentRole));
        }

        let title = line;
        let org: string | undefined;

        if (dateMatch) {
          title = line.replace(datePattern, "").replace(/[,|·•-]\s*$/, "").trim();
        }

        // Check if line contains company separator like "at", "|", or "-"
        const separatorMatch = title.match(/^(.+?)\s+(?:at|@|\||-)\s+(.+)$/i);
        if (separatorMatch) {
          title = separatorMatch[1].trim();
          org = separatorMatch[2].trim();
        } else if (i + 1 < lines.length && !lines[i + 1].match(/^[•\-\*]/) && !lines[i + 1].match(datePattern) && lines[i + 1].length < 60) {
          // Next line might be the company
          org = lines[i + 1];
          i++;
        }

        currentRole = {
          title: title || "Professional Role",
          organization: org,
          startDate: dateMatch ? dateMatch[2] : undefined,
          endDate: dateMatch ? (dateMatch[4]?.toLowerCase() === "present" ? undefined : dateMatch[4]) : undefined,
          isCurrent: dateMatch ? /present|current/i.test(dateMatch[4] || "") : false,
          bullets: [],
          rawLines: [line],
        };
      } else if (currentRole) {
        currentRole.bullets.push(line.replace(/^[•\-\*]\s*/, ""));
        currentRole.rawLines.push(line);
      } else {
        // Stray line before any role
        currentRole = {
          title: line,
          bullets: [],
          rawLines: [line],
        };
      }
    }

    if (currentRole && (currentRole.bullets.length > 0 || currentRole.title)) {
      results.push(this.formatExperienceRole(currentRole));
    }

    return results;
  }

  private static formatExperienceRole(role: {
    title: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    bullets: string[];
    rawLines: string[];
  }): StructuredResumeSection {
    return {
      entryType: "experience",
      title: role.title,
      organization: role.organization || null,
      startDate: role.startDate || null,
      endDate: role.endDate || null,
      isCurrent: role.isCurrent || false,
      bullets: role.bullets.length > 0 ? role.bullets : [role.title],
      confidence: 0.9,
      rawSnippet: role.rawLines.join("\n").substring(0, 300),
    };
  }

  /**
   * Parses education blocks
   */
  private static parseEducationBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const rangePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2}|present|current)/i;
    const yearPattern = /\b(?:19|20)\d{2}\b/;
    const degreePattern = /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|associate|diploma|doctorate)/i;
    const consumed = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      if (consumed.has(i)) continue;
      const line = lines[i];
      const titleOrSchool = line.replace(/^[•\-\*]\s*/, "");
      const isDateOnly = rangePattern.test(titleOrSchool) && titleOrSchool.replace(rangePattern, "").trim().length === 0;
      if (titleOrSchool.length < 5 || isDateOnly) continue;

      let title = titleOrSchool;
      let institution: string | undefined;
      let dateLine: string | undefined;
      const next = lines[i + 1];

      if (degreePattern.test(titleOrSchool)) {
        if (next && !degreePattern.test(next) && !/^[•\-\*]\s+/.test(next) && !rangePattern.test(next)) {
          institution = next;
          consumed.add(i + 1);
        }
        const dateIndex = i + (institution ? 2 : 1);
        const possibleDate = lines[dateIndex];
        if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
          possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 8) {
          dateLine = possibleDate;
          consumed.add(dateIndex);
        }
      } else if (next && degreePattern.test(next)) {
        institution = titleOrSchool;
        title = next.replace(/^[•\-\*]\s*/, "");
        consumed.add(i + 1);
        const possibleDate = lines[i + 2];
        if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
          possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 8) {
          dateLine = possibleDate;
          consumed.add(i + 2);
        }
      } else {
        const possibleDate = next;
        if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
          possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 8) {
          dateLine = possibleDate;
          consumed.add(i + 1);
        }
      }

      const dateText = dateLine || titleOrSchool;
      const rangeMatch = dateText.match(rangePattern);
      const yearMatches = dateText.match(/\b(?:19|20)\d{2}\b/g) || [];
      const startDate = rangeMatch?.[2] || (yearMatches.length > 1 ? yearMatches[0] : null);
      const endRaw = rangeMatch?.[4] || yearMatches.at(-1) || null;
      const endDate = endRaw && /present|current/i.test(endRaw) ? null : endRaw;

      results.push({
        entryType: "education",
        title,
        organization: institution || null,
        startDate,
        endDate,
        isCurrent: !!endRaw && /present|current/i.test(endRaw),
        bullets: [],
        confidence: 0.92,
        rawSnippet: [line, institution, dateLine].filter(Boolean).join("\n"),
      });
    }

    return results.slice(0, 5);
  }

  /**
   * Parses project blocks
   */
  private static parseProjectBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    let currentProj: { title: string; bullets: string[]; rawSnippet: string } | null = null;

    for (const line of lines) {
      const isBullet = /^[•\-\*]\s+/.test(line);
      if (!isBullet && line.length < 60) {
        if (currentProj) {
          results.push({
            entryType: "project",
            title: currentProj.title,
            bullets: currentProj.bullets.length > 0 ? currentProj.bullets : [currentProj.title],
            confidence: 0.9,
            rawSnippet: currentProj.rawSnippet,
          });
        }
        currentProj = {
          title: line,
          bullets: [],
          rawSnippet: line,
        };
      } else if (currentProj) {
        currentProj.bullets.push(line.replace(/^[•\-\*]\s*/, ""));
        currentProj.rawSnippet += "\n" + line;
      }
    }

    if (currentProj) {
      results.push({
        entryType: "project",
        title: currentProj.title,
        bullets: currentProj.bullets.length > 0 ? currentProj.bullets : [currentProj.title],
        confidence: 0.9,
        rawSnippet: currentProj.rawSnippet,
      });
    }

    return results;
  }

  /**
   * Parses skills into groups
   */
  private static parseSkillBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];

    for (const line of lines) {
      const parts = line.split(/:\s*/);
      if (parts.length > 1) {
        const category = parts[0].replace(/^[•\-\*]\s*/, "");
        const skillList = parts[1].split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean);

        results.push({
          entryType: "skill_group",
          title: category,
          bullets: skillList,
          confidence: 0.95,
          rawSnippet: line,
        });
      } else {
        const skillList = line.split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean);
        results.push({
          entryType: "skill_group",
          title: "Technical Skills",
          bullets: skillList,
          confidence: 0.88,
          rawSnippet: line,
        });
      }
    }

    return results;
  }

  /**
   * Parses certifications
   */
  private static parseCertificationBlocks(lines: string[]): StructuredResumeSection[] {
    return lines.map((line) => {
      const clean = line.replace(/^[•\-\*]\s*/, "");
      const dateMatch = clean.match(/\b(19|20)\d{2}\b/);
      return {
        entryType: "certification",
        title: clean,
        endDate: dateMatch ? dateMatch[0] : null,
        bullets: [clean],
        confidence: 0.95,
        rawSnippet: line,
      };
    });
  }

  /**
   * Converts StructuredResumeSection array into StagedItemInput array for ImportRepository
   */
  static toStagedItemInputs(sections: StructuredResumeSection[]): StagedItemInput[] {
    return sections.map((sec) => ({
      entryType: sec.entryType,
      rawSnippet: sec.rawSnippet,
      parsedDataJson: {
        title: sec.title,
        organization: sec.organization || null,
        location: sec.location || null,
        startDate: sec.startDate || null,
        endDate: sec.endDate || null,
        isCurrent: sec.isCurrent || false,
        descriptionContext: sec.descriptionContext || null,
        bullets: sec.bullets,
      },
      confidence: sec.confidence,
    }));
  }
}
