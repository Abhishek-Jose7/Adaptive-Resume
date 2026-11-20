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
   * Deterministically segments raw resume text into structured Data Bank entries.
   * Works completely offline with $0 spend and zero external API dependencies.
   * Supports clean newline-separated resumes as well as continuous/unstructured
   * pastes with inline headings, complex dates, and embedded sections.
   */
  static structureResumeText(rawText: string, sourceLabel: string = "Uploaded Resume"): StructuredResumeSection[] {
    const normalizedText = this.preNormalizeResumeText(rawText);
    const lines = normalizedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    const sections: Array<{ heading: string; lines: string[] }> = [];
    let currentHeading = "PROFILE";
    let currentLines: string[] = [];

    const sectionHeadingRegex = /^(?:===SECTION:\s*([^=]+)===|(?:professional\s+summary|career\s+summary|executive\s+summary|summary|profile|about\s*me|work\s*experience|experience|employment(?:\s*history)?|career\s+history|professional\s*experience|education|academic(?:\s*history)?|academic\s*background|projects|technical\s*projects|personal\s*projects|key\s*projects|open\s*source|skills|technical\s*skills|core\s+competencies|competencies|certifications?|licenses?|awards?|honors?|awards\s*(?:\/|&)\s*activities|publications?|volunteering|volunteer(?:\s*work)?|additional\s+information|languages)(?:\s*[:—–-])?)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const sectionMarkerMatch = line.match(/^===SECTION:\s*([^=]+)===$/i);

      if (sectionMarkerMatch) {
        if (currentLines.length > 0) {
          sections.push({ heading: currentHeading, lines: currentLines });
          currentLines = [];
        }
        currentHeading = sectionMarkerMatch[1].trim().toUpperCase();
        continue;
      }

      const isHeaderCandidate = line.length < 50 && (sectionHeadingRegex.test(line) || (line === line.toUpperCase() && line.length > 3 && line.length < 35));

      if (isHeaderCandidate && sectionHeadingRegex.test(line)) {
        if (currentLines.length > 0) {
          sections.push({ heading: currentHeading, lines: currentLines });
          currentLines = [];
        }
        currentHeading = line.replace(/[:—–-]$/, "").trim().toUpperCase();
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
        const summaryText = secLines.join(" ").replace(/\s{2,}/g, " ").trim();
        if (summaryText.length > 0) {
          structuredResults.push({
            entryType: "profile",
            title: "Professional Summary",
            organization: null,
            descriptionContext: summaryText,
            bullets: [summaryText],
            confidence: 0.95,
            rawSnippet: summaryText.substring(0, 300),
          });
        }
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
        const datePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b|present|current)/i;
        const dateLineIdx = secLines.findIndex((l) => datePattern.test(l));
        if (dateLineIdx >= 0) {
          const skillLines = secLines.slice(0, dateLineIdx);
          const expLines = secLines.slice(dateLineIdx);
          const skillEntries = this.parseSkillBlocks(skillLines);
          structuredResults.push(...skillEntries);
          const expInSkills = this.parseExperienceBlocks(expLines);
          structuredResults.push(...expInSkills);
        } else {
          const skillEntries = this.parseSkillBlocks(secLines);
          structuredResults.push(...skillEntries);
        }
      } else if (/CERTIF/i.test(heading)) {
        const certEntries = this.parseCertificationBlocks(secLines);
        structuredResults.push(...certEntries);
      } else if (/AWARD|HONOR/i.test(heading)) {
        for (const line of secLines) {
          const clean = line.replace(/^[•\-\*]\s*/, "").trim();
          if (clean.length > 3) {
            structuredResults.push({
              entryType: "award",
              title: clean,
              bullets: [clean],
              confidence: 0.9,
              rawSnippet: clean,
            });
          }
        }
      } else if (/LANGUAGES/i.test(heading)) {
        const langItems = secLines.join(" ").split(/[,|•·;]/).map((s) => s.trim()).filter(Boolean);
        if (langItems.length > 0) {
          structuredResults.push({
            entryType: "skill_group",
            title: "Languages",
            bullets: langItems,
            confidence: 0.95,
            rawSnippet: secLines.join(", "),
          });
        }
      } else if (/ADDITIONAL/i.test(heading)) {
        const addnText = secLines.join("\n");
        if (addnText.includes("—") || addnText.includes(" - ") || /•\s*Built|•\s*Developed|•\s*Implemented/i.test(addnText)) {
          const projEntries = this.parseProjectBlocks(secLines);
          if (projEntries.length > 0) {
            structuredResults.push(...projEntries);
            continue;
          }
        }
        structuredResults.push({
          entryType: "custom",
          title: section.heading,
          bullets: secLines.map((l) => l.replace(/^[•\-\*]\s*/, "")).filter(Boolean),
          confidence: 0.8,
          rawSnippet: secLines.join("\n").substring(0, 300),
        });
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
        structuredResults.push({
          entryType: "custom",
          title: section.heading,
          bullets: secLines.map((l) => l.replace(/^[•\-\*]\s*/, "")).filter(Boolean),
          confidence: 0.8,
          rawSnippet: secLines.join("\n").substring(0, 200),
        });
      }
    }

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
   * Pre-normalizes unstructured raw text
   */
  static preNormalizeResumeText(text: string): string {
    let cleaned = text.replace(/^(?:Professional Summary|profile|\d+%\s*match)\s*$/gim, "");

    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, " — ")
      .replace(/\u00A0/g, " ");

    cleaned = cleaned
      .replace(/\bI\s*'\s*ve\b/gi, "I've")
      .replace(/\bNext\s*\.\s*js\b/gi, "Next.js")
      .replace(/\bNode\s*\.\s*js\b/gi, "Node.js")
      .replace(/\bB\s*\.\s*E\s*\.\b/gi, "B.E.")
      .replace(/\bFr\s*\.\s*/gi, "Fr. ")
      .replace(/\bEmbeddin\s+gs\b/gi, "Embeddings")
      .replace(/\bO\s+rganised\b/g, "Organised")
      .replace(/\bD\s+eveloping\b/g, "Developing")
      .replace(/\bScikit\s*-\s*learn\b/gi, "Scikit-learn")
      .replace(/\bREST\s*APIs\b/gi, "REST APIs")
      .replace(/\bPrisma\s*ORM\b/gi, "Prisma ORM")
      .replace(/\bHTML\s*\/\s*CSS\b/gi, "HTML / CSS")
      .replace(/\bAI\s*\/\s*ML\b/gi, "AI / ML")
      .replace(/\s+([.,;:])/g, "$1")
      .replace(/\s+-\s+/g, " - ");

    // Auto-balance unclosed brackets in awards/certifications/hackathons: e.g. "[ Pixels Sies |" -> "[ Pixels Sies ] |"
    cleaned = cleaned.replace(/\[([^\]\n|;]+)(?=\s*(?:\||;|\n|$))/g, (match, p1) => `[ ${p1.trim()} ]`);

    cleaned = cleaned.replace(/\s*([•·▪●])\s*/g, "\n• ");

    const majorSections = [
      "PROFESSIONAL EXPERIENCE",
      "WORK EXPERIENCE",
      "EMPLOYMENT HISTORY",
      "TECHNICAL PROJECTS",
      "PERSONAL PROJECTS",
      "KEY PROJECTS",
      "PROJECTS",
      "PROFESSIONAL SUMMARY",
      "CAREER SUMMARY",
      "EXECUTIVE SUMMARY",
      "SUMMARY",
      "TECHNICAL SKILLS",
      "CORE COMPETENCIES",
      "SKILLS & EXPERTISE",
      "SKILLS",
      "EDUCATION",
      "ACADEMIC HISTORY",
      "ACADEMIC BACKGROUND",
      "CERTIFICATIONS & LICENSES",
      "CERTIFICATIONS",
      "CERTIFICATES",
      "AWARDS / ACTIVITIES",
      "AWARDS & ACTIVITIES",
      "AWARDS & HONORS",
      "HONORS & AWARDS",
      "AWARDS",
      "ADDITIONAL INFORMATION",
      "PUBLICATIONS",
      "VOLUNTEER EXPERIENCE",
      "VOLUNTEERING"
    ];

    majorSections.sort((a, b) => b.length - a.length);
    const escapedSections = majorSections.map((s) => s.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"));

    const sectionRegex = new RegExp(
      `(?:^|[\\.\\n\\r;|\\]\\[]|^|\\s{2,}|(?<=[a-z0-9]))\\s*\\b(${escapedSections.join("|")})\\b\\s*(?:[:—–-]|(?=[A-Z0-9]))`,
      "gi"
    );

    // Decouple embedded roles with explicit dates (e.g. "Technical Associate , GDSC CRCE June 2025 - May 2026")
    const roleWithDatePattern = /(?<=\s)(?:[A-Za-z0-9\s&+/.-]{0,25}?\s+)?\b(Technical\s+Associate|Technical\s+Lead|Technical\s+Intern|Software\s+Engineer|Frontend\s+Engineer|Backend\s+Engineer|Full\s*Stack\s+Engineer|Associate|Lead|Intern|Developer|Engineer|Manager|Architect|Consultant|Analyst|Director|Coordinator|President|Officer)\s*,\s*([A-Za-z0-9\s&.-]+?)\s+((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\b\d{4}\b\s*(?:-|–|—|to)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(?:\b\d{4}\b|present|current))\s*/gi;
    cleaned = cleaned.replace(roleWithDatePattern, (match, role, org, dates) => {
      return `\n\n===SECTION: PROFESSIONAL EXPERIENCE===\n${role.trim()} at ${org.trim()}\n${dates.trim()}\n`;
    });

    cleaned = cleaned.replace(/(?<=\.|\b\d{4}\b|\bpresent\b)\s+(?=(?:Organised|Built|Developed|Engineered|Coordinated|Led|Designed|Created|Implemented|Serving|Coordinating|Building)\b)/gi, "\n• ");

    cleaned = cleaned.replace(sectionRegex, (match, p1) => {
      return `\n\n===SECTION: ${p1.toUpperCase().trim()}===\n`;
    });

    return cleaned;
  }

  /**
   * Parses work experience blocks
   */
  private static parseExperienceBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const datePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b|present|current)/i;

    let currentRole: {
      title: string;
      organization?: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      bullets: string[];
      rawLines: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[•\-\*]\s+/.test(line);
      const dateMatch = line.match(datePattern);

      if (!isBullet) {
        if (/@|github\.com|linkedin\.com|\b\d{10}\b/.test(line)) {
          continue;
        }

        if (currentRole && !currentRole.startDate && dateMatch && line.replace(datePattern, "").trim().length < 15) {
          currentRole.startDate = dateMatch[2];
          currentRole.endDate = dateMatch[4]?.toLowerCase() === "present" ? undefined : dateMatch[4];
          currentRole.isCurrent = /present|current/i.test(dateMatch[4] || "");
          currentRole.rawLines.push(line);
          continue;
        }

        if (currentRole && (currentRole.bullets.length > 0 || currentRole.startDate || currentRole.organization)) {
          results.push(this.formatExperienceRole(currentRole));
        }

        let title = line;
        let org: string | undefined;

        if (dateMatch) {
          title = line.replace(datePattern, "").replace(/[,|·•-]\s*$/, "").trim();
        }

        const separatorMatch = title.match(/^(.+?)\s+(?:at|@|\||,|-)\s+(.+)$/i);
        if (separatorMatch) {
          title = separatorMatch[1].trim();
          org = separatorMatch[2].trim();
        } else if (i + 1 < lines.length && !lines[i + 1].match(/^[•\-\*]/) && !lines[i + 1].match(datePattern) && lines[i + 1].length < 60) {
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
        currentRole = {
          title: line,
          bullets: [],
          rawLines: [line],
        };
      }
    }

    if (currentRole && (currentRole.bullets.length > 0 || currentRole.startDate || currentRole.organization)) {
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
    let finalBullets = role.bullets;
    if (finalBullets.length === 0) {
      const allText = role.rawLines.join(" ");
      const sentences = allText
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15 && !s.includes(role.title));
      if (sentences.length > 0) {
        finalBullets = sentences;
      } else {
        finalBullets = [role.title];
      }
    }

    // Clean trailing contact information leakage from bullets (e.g. repeated page headers: "ABHISHEK JOSE 7738969557 | abhishekjose780@gmail.com")
    finalBullets = finalBullets
      .map((b) => {
        let cleaned = b
          .replace(/\b[A-Z\s]{4,30}\s+(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b.*$/i, "")
          .replace(/(?:\|\s*)?(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:linkedin|github)\.com\S*).*$/i, "")
          .trim();
        return cleaned;
      })
      .filter((b) => {
        if (!b || b.length < 3) return false;
        // Filter out if the entire bullet was purely contact details
        if (/@|github\.com|linkedin\.com|\b\d{10}\b/.test(b) && b.length < 50) return false;
        return true;
      });

    return {
      entryType: "experience",
      title: role.title,
      organization: role.organization || null,
      startDate: role.startDate || null,
      endDate: role.endDate || null,
      isCurrent: role.isCurrent || false,
      bullets: finalBullets.length > 0 ? finalBullets : [role.title],
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
        } else if (!institution && (titleOrSchool.includes("College") || titleOrSchool.includes("University") || titleOrSchool.includes("Institute") || titleOrSchool.includes("Engineering"))) {
          const parts = titleOrSchool.split(/(?=B\s*\.\s*E|Bachelor|Master|Associate)/i);
          if (parts.length > 1) {
            institution = parts[0].replace(/[,|·•-]\s*$/, "").trim();
            title = parts[1].replace(/\|.*$/, "").trim();
          }
        }
        const dateIndex = i + (institution && next === institution ? 2 : 1);
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

    if (results.length > 0) {
      return results.slice(0, 5);
    }

    // Fallback: single-line continuous text (e.g. Fr. Conceicao Rodrigues College ... B.E. in Computer Engineering)
    const fullText = lines.join(" ");
    const degreeMatch = fullText.match(/\b(B\s*\.\s*E\s*\.?|Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.)(?:\s+in\s+([A-Za-z\s]+))?/i);
    const dateMatch = fullText.match(/(?:expected\s+)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b20\d{2}\b)/i);

    if (degreeMatch || fullText.includes("Engineering") || fullText.includes("College") || fullText.includes("University")) {
      let institution = lines[0] || "University";
      let degree = degreeMatch ? degreeMatch[0] : "Degree";

      if (fullText.includes("College") || fullText.includes("University") || fullText.includes("Institute")) {
        const parts = fullText.split(/(?=B\s*\.\s*E|Bachelor|Master|Associate)/i);
        if (parts.length > 1) {
          institution = parts[0].replace(/[,|·•-]\s*$/, "").trim();
          degree = parts[1].replace(/\|.*$/, "").trim();
        }
      }

      return [{
        entryType: "education",
        title: degree,
        organization: institution,
        startDate: null,
        endDate: dateMatch ? dateMatch[2] : null,
        isCurrent: /expected/i.test(fullText),
        bullets: [],
        confidence: 0.95,
        rawSnippet: fullText.substring(0, 200),
      }];
    }

    return [];
  }

  /**
   * Parses project blocks
   */
  private static parseProjectBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const fullText = lines.join("\n");
    // Split projects on title patterns: "Project Name — Subtitle" or "Project Name - Subtitle", handling newline or sentence boundaries
    const projSegments = fullText.split(/(?:^|\n|(?<=\.)\s+)(?=[A-Z][A-Za-z0-9\s]{2,40}\s*(?:—|-)\s*[A-Za-z0-9\s]{2,50})/);

    if (projSegments.length > 1 || (projSegments.length === 1 && (projSegments[0].includes("—") || projSegments[0].includes(" | ")))) {
      for (const segment of projSegments) {
        const segLines = segment.split("\n").map((l) => l.trim()).filter(Boolean);
        if (segLines.length === 0) continue;

        let firstLine = segLines[0].replace(/^(?:ADDITIONAL INFORMATION|PROJECTS|KEY PROJECTS)\s+/i, "");
        let title = firstLine;
        let techLine = "";

        const pipeIdx = firstLine.indexOf("|");
        if (pipeIdx > 0) {
          const beforePipe = firstLine.substring(0, pipeIdx);
          const afterPipe = firstLine.substring(pipeIdx);
          const lastSpaceIdx = beforePipe.trimEnd().lastIndexOf(" ");
          if (lastSpaceIdx > 0) {
            title = beforePipe.substring(0, lastSpaceIdx).trim();
            techLine = beforePipe.substring(lastSpaceIdx).trim() + " " + afterPipe.trim();
          } else {
            title = beforePipe.trim();
            techLine = afterPipe.trim();
          }
        }

        const bullets: string[] = [];
        for (let i = 1; i < segLines.length; i++) {
          const l = segLines[i];
          if (l.startsWith("•") || l.startsWith("-") || l.startsWith("*")) {
            bullets.push(l.replace(/^[•\-\*]\s*/, ""));
          } else if (l.includes("|") && !techLine) {
            techLine = l;
          } else if (l.length > 20 && !l.includes(":") && !/Awards|Languages|Certifications/i.test(l)) {
            bullets.push(l);
          }
        }

        if (title.length > 2 && !/^(?:Languages|Certifications|Awards)/i.test(title)) {
          results.push({
            entryType: "project",
            title,
            bullets: bullets.length > 0 ? bullets : [title],
            descriptionContext: techLine || undefined,
            confidence: 0.92,
            rawSnippet: segment.substring(0, 300),
          });
        }
      }
      if (results.length > 0) return results;
    }

    // Standard fallback: line-by-line
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
    const categoryKeywords = [
      "Cloud & Deployment",
      "Cloud & Infrastructure",
      "Cloud Infrastructure",
      "Cloud Computing",
      "Cloud Platforms",
      "Databases & Tools",
      "Databases & Technologies",
      "Databases & Storage",
      "Databases",
      "Database Systems",
      "Programming Languages",
      "Languages & Frameworks",
      "Languages & Tools",
      "Languages",
      "AI & GenAI",
      "AI / GenAI",
      "AI & Machine Learning",
      "AI & ML",
      "ML & Computer Vision",
      "Machine Learning & CV",
      "Machine Learning & Computer Vision",
      "Web & Backend",
      "Web & Frontend",
      "Web Technologies",
      "Frontend & Backend",
      "Full Stack Development",
      "Web Development",
      "Frontend Technologies",
      "Backend Technologies",
      "Frontend",
      "Backend",
      "DevOps & CI/CD",
      "DevOps & Cloud",
      "DevOps",
      "Frameworks & Libraries",
      "Frameworks & Tools",
      "Frameworks",
      "Libraries",
      "Tools & Technologies",
      "Tools & Frameworks",
      "Tools & Platforms",
      "Developer Tools",
      "Tools",
      "Platforms",
      "Methodologies & Practices",
      "Core Competencies",
      "Soft Skills"
    ];

    categoryKeywords.sort((a, b) => b.length - a.length);

    let fullText = lines.join("\n");
    for (const cat of categoryKeywords) {
      const escaped = cat.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
      fullText = fullText.replace(
        new RegExp(`(^|\\n|[|;])\\s*(${escaped})\\s*(?::|(?=[A-Za-z0-9]))`, "gi"),
        `\n===CAT:$2===\n`
      );
      fullText = fullText.replace(
        new RegExp(`(?<=[A-Za-z0-9+/.)\\]])\\s+(${escaped})\\s*(?::|(?=[A-Za-z0-9]))`, "gi"),
        `\n===CAT:$1===\n`
      );
    }

    const pieces = fullText.split(/===CAT:\s*([^=]+)===/);
    const results: StructuredResumeSection[] = [];

    if (pieces.length > 1) {
      for (let i = 1; i < pieces.length; i += 2) {
        const category = pieces[i].trim();
        const rawSkills = pieces[i + 1]?.trim() || "";
        const cleanRaw = rawSkills.replace(/^[:—–-]\s*/, "");
        const skillList = cleanRaw
          .split(/[,|•·;\n]\s*|\s{2,}/)
          .map((s) => s.trim().replace(/^[:•\-\*]\s*/, ""))
          .filter((s) => s.length > 0 && !categoryKeywords.some((ck) => ck.toLowerCase() === s.toLowerCase()));

        if (skillList.length > 0) {
          results.push({
            entryType: "skill_group",
            title: category,
            bullets: skillList,
            confidence: 0.95,
            rawSnippet: `${category}: ${skillList.join(", ")}`,
          });
        }
      }
      if (results.length > 0) return results;
    }

    for (const line of lines) {
      const parts = line.split(/:\s*/);
      if (parts.length > 1) {
        const cat = parts[0].replace(/^[•\-\*]\s*/, "").trim();
        const skills = parts[1].split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean);
        results.push({
          entryType: "skill_group",
          title: cat || "Technical Skills",
          bullets: skills,
          confidence: 0.9,
          rawSnippet: line,
        });
      } else {
        const skills = line.split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean);
        if (skills.length > 0) {
          results.push({
            entryType: "skill_group",
            title: "Technical Skills",
            bullets: skills,
            confidence: 0.85,
            rawSnippet: line,
          });
        }
      }
    }

    return results.length > 0 ? results : [{
      entryType: "skill_group",
      title: "Technical Skills",
      bullets: lines.join(" ").split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean),
      confidence: 0.85,
      rawSnippet: fullText.substring(0, 200),
    }];
  }

  /**
   * Parses certifications
   */
  private static parseCertificationBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    for (const line of lines) {
      const items = line.split(/[,|•·;]\s*(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        const clean = item.replace(/^[•\-\*]\s*/, "").trim();
        if (clean.length > 3) {
          const dateMatch = clean.match(/\b(19|20)\d{2}\b/);
          results.push({
            entryType: "certification",
            title: clean,
            endDate: dateMatch ? dateMatch[0] : null,
            bullets: [clean],
            confidence: 0.95,
            rawSnippet: clean,
          });
        }
      }
    }
    return results;
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

export interface SkillCategoryMapping {
  category: string;
  skills: string[];
}

/**
 * Classifies a flat list of skills into coherent, canonical skill categories
 * for clean UI presentation, filtering, and ATS optimization.
 */
export function classifySkills(skills: string[]): SkillCategoryMapping[] {
  const categories: Record<string, string[]> = {
    "Languages": [],
    "AI & GenAI": [],
    "Machine Learning & CV": [],
    "Web & Backend": [],
    "Databases & Tools": [],
    "Cloud & DevOps": [],
    "Other Skills": [],
  };

  const rules: { regex: RegExp; category: string }[] = [
    { regex: /^(?:python|javascript|typescript|c|c\+\+|c#|java|dart|sql|go|golang|rust|ruby|php|swift|kotlin|html|css|html5|css3|bash|shell|r|matlab|scala|perl|elixir)$/i, category: "Languages" },
    { regex: /^(?:generative\s+ai|genai|llm[s]?|rag|ai\s+agents|embeddings?|prompt\s+engineering|nlp|ocr|langchain|llamaindex|openai|anthropic|claude|gemini|fine[- ]tuning|vector\s*db|pinecone|chromadb|weaviate|faiss|ai\s+automation)$/i, category: "AI & GenAI" },
    { regex: /^(?:tensorflow|pytorch|scikit[- ]learn|pandas|numpy|opencv|mediapipe|object\s+detection|keras|matplotlib|seaborn|deep\s+learning|computer\s+vision|machine\s+learning|xgboost|lightgbm)$/i, category: "Machine Learning & CV" },
    { regex: /^(?:react|react\.js|next\.js|node\.js|express|express\.js|flask|django|fastapi|spring\s+boot|asp\.net|graphql|rest\s+api[s]?|tailwind\s+css|prisma(?:\s+orm)?|hibernate|vue|angular|redux|zustand)$/i, category: "Web & Backend" },
    { regex: /^(?:postgresql|postgres|sqlite|mysql|mongodb|redis|git|github|gitlab|playwright|selenium|postman|jira|supabase|firebase|vite|webpack)$/i, category: "Databases & Tools" },
    { regex: /^(?:cloudflare\s+workers|cloudflare\s+d1|cloudflare|vercel|wrangler|aws|azure|gcp|google\s+cloud|docker|kubernetes|k8s|ci\/cd|terraform|linux|nginx)$/i, category: "Cloud & DevOps" },
  ];

  for (const s of skills) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    let matched = false;
    for (const rule of rules) {
      if (rule.regex.test(trimmed)) {
        if (!categories[rule.category].includes(trimmed)) {
          categories[rule.category].push(trimmed);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!categories["Other Skills"].includes(trimmed)) {
        categories["Other Skills"].push(trimmed);
      }
    }
  }

  return Object.entries(categories)
    .filter(([_, list]) => list.length > 0)
    .map(([category, list]) => ({ category, skills: list }));
}

