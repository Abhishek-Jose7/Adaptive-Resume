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
   * Extracts candidate contact information (Name, Email, Phone, Location, Headline, Links)
   * from the top of the resume, separating it cleanly from the professional summary.
   */
  static extractPersonalDetails(rawText: string): {
    name: string | null;
    headline: string | null;
    location: string | null;
    email: string | null;
    phone: string | null;
    links: string[];
    rawSnippet: string;
  } | null {
    const topText = rawText
      .substring(0, 1200)
      .replace(/((?:github|linkedin)\.com\/[^\s]+?)[ \t]*-[ \t]+([^\s]+)/gi, "$1-$2");
    const emailMatch = topText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
    const phoneMatch = topText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}\b/);

    if (!emailMatch && !phoneMatch) {
      return null;
    }

    const email = emailMatch ? emailMatch[1].trim() : null;
    let phone = phoneMatch ? phoneMatch[0].trim() : null;
    if (phone && phone.length < 7) phone = null;

    // Links: github, linkedin, portfolio, personal sites
    const linkMatches = topText.match(/(?:(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[A-Za-z0-9_.-]+|linkedin\.com\/in\/[A-Za-z0-9_.-]+|[a-zA-Z0-9-]+\.(?:dev|me|io|com)\/[A-Za-z0-9_.-]+))/gi) || [];
    const links = Array.from(new Set(linkMatches.map((l) => l.trim().replace(/[.,;]+$/, ""))));

    // Location
    const locMatch = topText.match(/\b([A-Z][A-Za-z\s]+,\s*(?:India|USA|United States|UK|Canada|Germany|Singapore|[A-Z]{2})(?:\s*\d{5,6})?|[A-Z][a-zA-Z\s]+\s+\d{5,6})\b/i);
    const location = locMatch ? locMatch[1].trim() : null;

    // Candidate name: extract from top lines or top segment before first bullet / pipe
    let name: string | null = null;
    let headline: string | null = null;

    const firstSegment = topText.split(/(?:\n|•|\||===SECTION)/)[0].trim();
    if (/^[A-Z][A-Za-z'.\s-]{2,40}$/.test(firstSegment) && !/^(?:Resume|Curriculum|Profile|Summary|Professional)/i.test(firstSegment)) {
      name = firstSegment;
    } else {
      const nameMatch = topText.match(/^([A-Z][A-Z\s]{2,35})(?=\s*(?:•|\||\n|\d|\+))/);
      if (nameMatch && !/^(?:RESUME|PROFILE|SUMMARY)/i.test(nameMatch[1].trim())) {
        name = nameMatch[1].trim();
      }
    }

    // Headline: Look for student/role/engineer phrase in header before summary
    const headlineMatch = topText.match(/(?:•|\||\n)\s*([A-Za-z0-9\s/&,.-]{4,70}?\b(?:Student|Engineer|Developer|Analyst|Designer|Architect|Lead|Manager))\s*(?:•|\||\n|$)/i);
    if (headlineMatch) {
      const candidateHeadline = headlineMatch[1].trim();
      if (!candidateHeadline.includes("@") && !candidateHeadline.includes("http") && candidateHeadline !== name) {
        headline = candidateHeadline;
      }
    }

    const contactParts = [name, headline, location, email, phone, ...links].filter(Boolean);
    if (contactParts.length === 0) return null;

    return {
      name,
      headline,
      location,
      email,
      phone,
      links,
      rawSnippet: contactParts.join(" | "),
    };
  }

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

    const sectionHeadingRegex = /^(?:===SECTION:\s*([^=]+)===|(?:professional\s+summary|career\s+summary|executive\s+summary|summary|profile|about\s*me|work\s*experience|experience|employment(?:\s*history)?|career\s+history|professional\s*experience|education|academic(?:\s*history)?|academic\s*background|projects\s*&\s*production\s*builds|projects|technical\s*projects|personal\s*projects|key\s*projects|open\s*source|technical\s*&\s*core\s*skills|skills|technical\s*skills|core\s+competencies|competencies|certifications?\s*(?:&|\/|and)\s*achievements?|certifications?|certificates?|licenses?|awards?|honors?|achievements?|awards\s*(?:\/|&)\s*activities|publications?|volunteering|volunteer(?:\s*work)?|additional\s+information|languages|spoken\s*languages)(?:\s*[:—–-])?)$/i;

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

      const isHeaderCandidate = line.length < 50 && (
        (sectionHeadingRegex.test(line) && !(/SKILL/i.test(currentHeading) && /^(?:languages|tools|frameworks|databases|cloud|platforms|libraries)$/i.test(line.trim()))) ||
        (line === line.toUpperCase() && line.length > 3 && line.length < 35)
      );

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
    const personalDetails = this.extractPersonalDetails(normalizedText);

    if (personalDetails) {
      const bullets = [
        personalDetails.email ? `Email: ${personalDetails.email}` : "",
        personalDetails.phone ? `Phone: ${personalDetails.phone}` : "",
        personalDetails.headline ? `Headline: ${personalDetails.headline}` : "",
        ...personalDetails.links.map((l) => `Link: ${l}`),
      ].filter(Boolean);

      structuredResults.push({
        entryType: "profile",
        title: "Personal Details",
        organization: personalDetails.name || null,
        location: personalDetails.location || null,
        descriptionContext: personalDetails.headline || null,
        bullets: bullets.length > 0 ? bullets : [personalDetails.rawSnippet],
        confidence: 0.98,
        rawSnippet: personalDetails.rawSnippet,
      });
    }

    for (const section of sections) {
      const heading = section.heading.toUpperCase();
      const secLines = section.lines;

      if (/SUMMARY|PROFILE|ABOUT/i.test(heading)) {
        const datePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b|present|current)/i;
        const hasDates = secLines.some((l) => datePattern.test(l));
        const hasBullets = secLines.some((l) => /^[•\-\*]\s+/.test(l));

        if (heading === "PROFILE" && (hasDates || (hasBullets && secLines.some((l) => /(?:Engineer|Developer|Manager|Lead|Intern|Architect|Consultant|Analyst|Director|Associate)\b/i.test(l))))) {
          const expEntries = this.parseExperienceBlocks(secLines);
          structuredResults.push(...expEntries);
          continue;
        }

        // Exclude contact information, phone, email, and candidate header links from the summary
        const nonContactLines = secLines.filter((l) => {
          if (/@|github\.com|linkedin\.com|\b\d{10}\b|portfolio|http/i.test(l)) return false;
          if (/\b(?:Email|Phone|Mobile|Tel|LinkedIn|GitHub|Portfolio|Website|Address)\s*:/i.test(l)) return false;
          if (l.includes("|") && l.length < 160 && (/@|github|linkedin|\d{10}|Mumbai|India|USA|CA|NY|Street|Lane|Road/i.test(l) || l.split("|").length >= 3)) return false;
          if (/^[A-Z\s]{3,40}$/.test(l) && !/SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS/i.test(l)) return false;
          if (personalDetails?.name && l.toLowerCase().includes(personalDetails.name.toLowerCase()) && l.length < 60) return false;
          if (personalDetails?.headline && l.toLowerCase().includes(personalDetails.headline.toLowerCase()) && l.length < 80) return false;
          if (personalDetails?.location && l.toLowerCase().includes(personalDetails.location.toLowerCase()) && l.length < 50) return false;
          return true;
        });

        const cleanBullets = nonContactLines
          .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
          .filter((l) => l.length > 15);

        const summaryText = cleanBullets.join(" ").replace(/\s{2,}/g, " ").trim();
        if (summaryText.length > 25) {
          structuredResults.push({
            entryType: "profile",
            title: "Professional Summary",
            organization: null,
            descriptionContext: summaryText,
            bullets: cleanBullets.length > 1 ? cleanBullets : [summaryText],
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
      } else if (/CERTIF.*ACHIEVE|ACHIEVE.*CERTIF/i.test(heading)) {
        const combinedEntries = this.parseCertificationAndAchievementBlocks(secLines);
        structuredResults.push(...combinedEntries);
      } else if (/CERTIF/i.test(heading)) {
        const certEntries = this.parseCertificationBlocks(secLines);
        structuredResults.push(...certEntries);
      } else if (/AWARD|HONOR|ACHIEVE/i.test(heading)) {
        // Merge wrapped lines (e.g. if previous line ended with unclosed bracket or open symbol)
        const mergedLines: string[] = [];
        for (const rawLine of secLines) {
          const l = rawLine.trim();
          if (!l) continue;
          if (mergedLines.length > 0) {
            const prev = mergedLines[mergedLines.length - 1];
            const prevOpen = (prev.match(/\[/g) || []).length > (prev.match(/\]/g) || []).length;
            if (prevOpen || /[,|–—\-]$/.test(prev) || /^[\]\),|]/.test(l)) {
              mergedLines[mergedLines.length - 1] = `${prev} ${l}`;
              continue;
            }
          }
          mergedLines.push(l);
        }

        for (const line of mergedLines) {
          let clean = line.replace(/^[•\-\*]\s*/, "").trim();
          clean = this.balanceBrackets(clean);
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
      } else if (/SPOKEN\s*LANGUAGES/i.test(heading)) {
        const langItems = secLines.join(" ").split(/[,|•·;]/).map((s) => s.trim().replace(/^[:•\-\*]\s*/, "")).filter(Boolean);
        if (langItems.length > 0) {
          structuredResults.push({
            entryType: "skill_group",
            title: "Languages (Spoken)",
            bullets: langItems,
            confidence: 0.95,
            rawSnippet: secLines.join(", "),
          });
        }
      } else if (/LANGUAGES/i.test(heading)) {
        const secText = secLines.join(" ");
        if (/AI|GenAI|ML|Cloud|Databases|Backend|Frontend|Frameworks|Tools|React|Python|PostgreSQL|TypeScript/i.test(secText) && /(?:&|\||\/)/.test(secText)) {
          const skillEntries = this.parseSkillBlocks(secLines);
          structuredResults.push(...skillEntries);
        } else {
          const langItems = secLines.join(" ").split(/[,|•·;]/).map((s) => s.trim().replace(/^[:•\-\*]\s*/, "")).filter(Boolean);
          if (langItems.length > 0) {
            structuredResults.push({
              entryType: "skill_group",
              title: /english|hindi|spanish|french|german|mandarin/i.test(secText) ? "Languages (Spoken)" : "Languages",
              bullets: langItems,
              confidence: 0.95,
              rawSnippet: secLines.join(", "),
            });
          }
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

    const CANONICAL_TYPE_WEIGHT: Record<string, number> = {
      profile: 1,
      experience: 2,
      volunteer: 3,
      project: 4,
      skill_group: 5,
      education: 6,
      certification: 7,
      award: 8,
      publication: 9,
      custom: 10,
    };

    return structuredResults.sort((a, b) => {
      const weightA = CANONICAL_TYPE_WEIGHT[a.entryType] ?? 99;
      const weightB = CANONICAL_TYPE_WEIGHT[b.entryType] ?? 99;
      if (weightA !== weightB) return weightA - weightB;
      if (a.entryType === "profile" && b.entryType === "profile") {
        if (a.title === "Personal Details") return -1;
        if (b.title === "Personal Details") return 1;
      }
      return 0;
    });
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
      .replace(/\bO\s+rganised\b/gi, "Organised")
      .replace(/\bD\s+eveloping\b/gi, "Developing")
      .replace(/\bC\s+oordinating\b/gi, "Coordinating")
      .replace(/\bB\s+uilding\b/gi, "Building")
      .replace(/\bE\s+ngineered\b/gi, "Engineered")
      .replace(/\bS\s+erving\b/gi, "Serving")
      .replace(/\bScikit\s*-\s*learn\b/gi, "Scikit-learn")
      .replace(/\bREST\s*APIs\b/gi, "REST APIs")
      .replace(/\bPrisma\s*ORM\b/gi, "Prisma ORM")
      .replace(/\bHTML\s*\/\s*CSS\b/gi, "HTML / CSS")
      .replace(/\bAI\s*\/\s*ML\b/gi, "AI / ML")
      .replace(/[ \t]+([.,;:])/g, "$1")
      .replace(/[ \t]+-[ \t]+/g, " - ");

    // Spaced hyphens before conjunctions: "AWS - and" -> "AWS and"
    cleaned = cleaned.replace(/\b([A-Za-z0-9]+)[ \t]*-[ \t]+(and|or|with|to)\b/gi, "$1 $2");

    // Fix spaced hyphens in URLs: "linkedin.com/in/scarlett- menezes777" -> "linkedin.com/in/scarlett-menezes777"
    cleaned = cleaned.replace(/((?:github|linkedin)\.com\/[^\s]+?)[ \t]*-[ \t]+([^\s]+)/gi, "$1-$2");

    // Fix spaced hyphens in compound words: "hands - on" -> "hands-on", "full - stack" -> "full-stack", "Real - Time" -> "Real-Time", "AI - powered" -> "AI-powered", "real-time", "on-device", "voice-first"
    cleaned = cleaned
      .replace(/\bReal\s*-\s*Time\b/g, "Real-Time")
      .replace(/\breal\s*-\s*time\b/gi, "real-time")
      .replace(/\bon\s*-\s*device\b/gi, "on-device")
      .replace(/\bvoice\s*-\s*first\b/gi, "voice-first")
      .replace(/\b3\s*r\s*d\s*Y\s*e\s*a\s*r\b/gi, "3rd Year")
      .replace(/\b([A-Za-z0-9]+)[ \t]+-[ \t]+([A-Za-z0-9]+)\b/g, "$1-$2");

    // Clean multi-page headers and footers (e.g. "Page 1 of 2", "Page 2 of 2", "1 / 2", "Page 2")
    cleaned = cleaned.replace(/(?:^|\n)[ \t]*(?:Page\s+\d+\s*(?:of|\/)\s*\d+|\b\d+\s*(?:of|\/)\s*\d+\b|Page\s+\d+)[ \t]*(?=\n|$)/gi, "\n");

    // Fix OCR and PDF mid-word whitespace splits
    cleaned = cleaned
      .replace(/\bCa\s+mpus\b/gi, "Campus")
      .replace(/\ble\s+ading\b/gi, "leading")
      .replace(/\bcom\s+munity\b/gi, "community")
      .replace(/\bintern\s+ational\b/gi, "international")
      .replace(/\bI\s+ndian\b/gi, "Indian")
      .replace(/\bu\s+ser\b/gi, "user")
      .replace(/\bevent\s+s\b/gi, "events")
      .replace(/\bsecurit\s+y\b/gi, "security")
      .replace(/\bEngi\s+ne\b/gi, "Engine")
      .replace(/\bEng\s+ineering\b/gi, "Engineering")
      .replace(/\brecog\s+nition\b/gi, "recognition")
      .replace(/\bconnec\s+tions\b/gi, "connections")
      .replace(/\bcoordi\s+nating\b/gi, "coordinating")
      .replace(/\borgani\s+sation\b/gi, "organisation")
      .replace(/\bplat\s+form\b/gi, "platform")
      .replace(/\bvul\s+nerability\b/gi, "vulnerability")
      .replace(/\bassess\s+ment\b/gi, "assessment")
      .replace(/\bidenti\s+fication\b/gi, "identification");

    // Clean whitespace around symbols & and |
    cleaned = cleaned
      .replace(/\s*&\s*/g, " & ")
      .replace(/\s*\|\s*/g, " | ");

    // Auto-balance unclosed brackets in awards/certifications/hackathons: e.g. "[ Pixels Sies |" -> "[ Pixels Sies ] |"
    cleaned = cleaned.replace(/\[([^\]\n|;]+)(?=\s*(?:\||;|\n|$))/g, (match, p1) => `[ ${p1.trim()} ]`);

    // Standardize all Unicode bullets (including Word Wingdings \uF0B7 '', square bullets, arrows, diamonds) to newline bullet
    cleaned = cleaned.replace(/\s*([•·▪●\uF0B7\uF0A7\u2022\u2023\u2043\u2219\u25CB\u25CF\u25AA\u25AB\u25B6\u25BA\u25C6])\s*/g, "\n• ");

    // Break inline skill category headings onto new lines (e.g. "...C / C++ Frontend / Mobile: React Native...")
    const knownSkillCategories = "Frontend\\s*(?:\\/|&)\\s*Mobile|Backend\\s*(?:\\/|&)\\s*APIs|Databases\\s*(?:\\/|&)\\s*(?:Cloud|Tools|Technologies|Storage)|Tools\\s*(?:\\/|&)\\s*(?:Others|Other|Technologies|Frameworks|Platforms)|Languages\\s*(?:\\/|&)\\s*(?:Frameworks|Tools)|Programming\\s*Languages|Cloud\\s*(?:\\/|&)\\s*(?:Deployment|Infrastructure|Platforms)|DevOps\\s*(?:\\/|&)\\s*CI\\/CD|AI\\s*(?:\\/|&)\\s*ML|AI\\s*(?:\\/|&)\\s*GenAI|Web\\s*(?:\\/|&)\\s*Backend";

    cleaned = cleaned.replace(
      new RegExp(`(?<=[A-Za-z0-9+/.)\\]])[ \\t]+(${knownSkillCategories})[ \\t]*:?[ \\t]*`, "gi"),
      "\n$1:\n"
    );

    const actionVerbs = "Lead|Manage|Drive|Promote|Secure|Oversee|Served|Organised|Organized|Built|Developed|Engineered|Coordinating|Building|Serving|Coordinated|Led|Designed|Created|Implemented|Spearheaded|Architected|Directed|Supervised|Coordinate|Conduct|Research";

    // Handle spoken languages inline (e.g. "Languages: English, Hindi, Malayalam, Marathi")
    cleaned = cleaned.replace(/(?:^|\n|\s{2,})\s*Languages\s*:\s*([A-Za-z\s,.]+?)(?=\s*(?:===|Certifications|Awards|Projects|\n|$))/gi, (match, langs) => {
      const isSpoken = /english|hindi|spanish|french|german|mandarin|malayalam|marathi|telugu|tamil|kannada|bengali|gujarati|punjabi|japanese|chinese|russian|arabic/i.test(langs);
      if (isSpoken) {
        return `\n\n===SECTION: SPOKEN LANGUAGES===\n${langs.trim()}\n`;
      }
      return match;
    });

    const majorSections = [
      "PROFESSIONAL EXPERIENCE",
      "WORK EXPERIENCE",
      "EMPLOYMENT HISTORY",
      "EXPERIENCE",
      "CAREER HISTORY",
      "TECHNICAL PROJECTS",
      "PERSONAL PROJECTS",
      "KEY PROJECTS",
      "PROJECTS & PRODUCTION BUILDS",
      "PROJECTS & BUILDS",
      "PROJECTS",
      "PROFESSIONAL SUMMARY",
      "CAREER SUMMARY",
      "EXECUTIVE SUMMARY",
      "ABOUT ME",
      "ABOUT",
      "SUMMARY",
      "PROFILE",
      "TECHNICAL SKILLS",
      "TECHNICAL & CORE SKILLS",
      "CORE COMPETENCIES",
      "SKILLS & EXPERTISE",
      "SKILLS",
      "EDUCATION",
      "ACADEMIC HISTORY",
      "ACADEMIC BACKGROUND",
      "CERTIFICATIONS & ACHIEVEMENTS",
      "CERTIFICATIONS AND ACHIEVEMENTS",
      "CERTIFICATIONS / ACHIEVEMENTS",
      "CERTIFICATIONS & AWARDS",
      "CERTIFICATIONS AND AWARDS",
      "ACHIEVEMENTS & CERTIFICATIONS",
      "CERTIFICATIONS & LICENSES",
      "CERTIFICATIONS",
      "CERTIFICATES & ACHIEVEMENTS",
      "CERTIFICATES",
      "AWARDS / ACTIVITIES",
      "AWARDS & ACTIVITIES",
      "AWARDS & HONORS",
      "HONORS & AWARDS",
      "ACHIEVEMENTS",
      "ACADEMIC ACHIEVEMENTS",
      "AWARDS",
      "CO-CURRICULAR ACTIVITIES",
      "EXTRA-CURRICULAR ACTIVITIES",
      "EXTRACURRICULAR ACTIVITIES",
      "LEADERSHIP & ACTIVITIES",
      "LEADERSHIP",
      "POSITIONS OF RESPONSIBILITY",
      "ADDITIONAL INFORMATION",
      "PUBLICATIONS",
      "VOLUNTEER EXPERIENCE",
      "VOLUNTEERING",
      "SPOKEN LANGUAGES",
    ];

    majorSections.sort((a, b) => b.length - a.length);
    const escapedSections = majorSections.map((s) => s.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"));

    const sectionRegex = new RegExp(
      `(?:^|[\\.\\n\\r;|\\]\\[]|\\s{2,}|(?<=[a-z0-9]))\\s*\\b(${escapedSections.join("|")})\\b\\s*(?:[:—–-]|(?=[•·▪●\uF0B7\\*\\-A-Z0-9=\\r\\n]|$))`,
      "gi"
    );

    cleaned = cleaned.replace(sectionRegex, (match, p1, offset, fullStr) => {
      const textBefore = fullStr.substring(Math.max(0, offset - 10), offset);
      const isStartOfLine = /(?:^|[\r\n])\s*$/.test(textBefore);

      // If inline and the matched word is lowercase (e.g. "hands-on experience in"), it is prose, not a section header!
      if (!isStartOfLine && p1 === p1.toLowerCase()) {
        return match;
      }

      // If inline and followed by common prepositions / verbs, it is prose (e.g. "experience with", "skills in", "experience building")
      const textAfter = fullStr.substring(offset + match.length, offset + match.length + 15);
      if (!isStartOfLine && /^\s+(?:in|with|of|for|to|and|across|building|using)\b/i.test(textAfter)) {
        return match;
      }

      return `\n\n===SECTION: ${p1.toUpperCase().trim()}===\n`;
    });

    // Decouple embedded roles with explicit dates (e.g. "Technical Associate , GDSC CRCE June 2025 - May 2026")
    const roleWithDatePattern = /(?<=\s|^)\b((?:Technical[ \t]+|Software[ \t]+|Frontend[ \t]+|Backend[ \t]+|Full[ \t]*Stack[ \t]+|Senior[ \t]+|Junior[ \t]+)?(?:Associate|Lead|Intern|Developer|Engineer|Manager|Architect|Consultant|Analyst|Director|Coordinator|President|Officer))\s*,\s*([A-Za-z0-9\t &.-]+?)[ \t]+((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[ \t]+)?\b\d{4}\b[ \t]*(?:-|–|—|to)[ \t]*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[ \t]*)?(?:\b\d{4}\b|present|current))\s*/gi;
    cleaned = cleaned.replace(roleWithDatePattern, (match, role, org, dates) => {
      return `\n\n===SECTION: PROFESSIONAL EXPERIENCE===\n===ROLE: ${role.trim()} at ${org.trim()}===\n${dates.trim()}\n`;
    });

    // Decouple embedded roles with —, –, -, at, @, or comma
    const embeddedRolePattern = new RegExp(
      `(?:^|\\.|\\n|[ \t]{2,})[ \t]*\\b((?:Senior[ \t]+|Junior[ \t]+|Technical[ \t]+|Lead[ \t]+|Head[ \t]+of[ \t]+|Public[ \t]+Relations[A-Za-z0-9 ,/-]*?[ \t]+)?[A-Z][A-Za-z0-9 /&,-]{1,40}?\\b(?:Head|Lead|Intern|Manager|Developer|Engineer|Architect|Director|President|Coordinator|Officer|Analyst|Consultant|Specialist|Associate))[ \t]*(?:—|–|-|at|@|,)[ \t]*([A-Za-z0-9 &().,-]+?)(?=[ \t]*(?:${actionVerbs}|\\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\\n|•|$))`,
      "gi"
    );

    // Only apply to experience sections so summary, education, skills, certifications, awards, projects aren't broken
    const sectionChunks = cleaned.split(/(?====SECTION:)/);
    cleaned = sectionChunks
      .map((chunk) => {
        if (/===SECTION:\s*(?:EXPERIENCE|WORK\s*EXPERIENCE|EMPLOYMENT|PROFESSIONAL\s*EXPERIENCE)/i.test(chunk)) {
          return chunk.replace(embeddedRolePattern, (match, role, org) => {
            if (role.includes("===") || org.includes("===")) return match;
            return `\n\n===ROLE: ${role.trim()} at ${org.trim()}===\n`;
          });
        }
        return chunk;
      })
      .join("");

    // Also split before action verbs if preceded by period, date, country, or metric words
    cleaned = cleaned.replace(
      new RegExp(`(?<=\\.|\\b\\d{4}\\b|\\bpresent\\b|teams|portal|club|activities|country|countries|workflows)\\s+(?=(?:${actionVerbs})\\b)`, "gi"),
      "\n• "
    );

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
      const isActionSentence = Boolean(
        currentRole &&
        currentRole.organization &&
        (
          /^(?:Lead|Leading|Manage|Managing|Drive|Driving|Promote|Promoting|Secure|Securing|Oversee|Overseeing|Served|Organised|Organized|Built|Building|Developed|Developing|Engineered|Coordinating|Serving|Coordinated|Spearheaded|Spearheading|Created|Creating|Designed|Designing|Implemented|Implementing|Supervised|Conduct|Research)\b/i.test(line) ||
          (line.length > 55 && !/(?:—|–|-|\bat\b|@|\|)/.test(line))
        )
      );
      const dateMatch = line.match(datePattern);

      const roleMarkerMatch = line.match(/^===ROLE:\s*(.+?)\s+at\s+(.+)===$/i);
      if (roleMarkerMatch) {
        let mergedTitle = roleMarkerMatch[1].trim();
        if (currentRole && !currentRole.organization && currentRole.bullets.length === 0 && currentRole.title && currentRole.title !== "Professional Role") {
          mergedTitle = `${currentRole.title} / ${mergedTitle}`;
        } else if (currentRole && (currentRole.bullets.length > 0 || currentRole.startDate || currentRole.organization)) {
          results.push(this.formatExperienceRole(currentRole));
        }
        currentRole = {
          title: mergedTitle,
          organization: roleMarkerMatch[2].trim(),
          bullets: [],
          rawLines: [line],
        };
        continue;
      }

      if (!isBullet && !isActionSentence) {
        if (/@|github\.com|linkedin\.com|\b\d{10}\b/.test(line)) {
          continue;
        }

        if (currentRole && !currentRole.startDate && dateMatch) {
          const orgPart = line.replace(datePattern, "").replace(/[,|·•—–-]\s*$/, "").trim();
          if (!currentRole.organization && orgPart.length > 0 && orgPart.length < 50) {
            currentRole.organization = orgPart;
          }
          currentRole.startDate = dateMatch[2];
          currentRole.endDate = dateMatch[4]?.toLowerCase() === "present" ? undefined : dateMatch[4];
          currentRole.isCurrent = /present|current/i.test(dateMatch[4] || "");
          currentRole.rawLines.push(line);
          continue;
        }

        const isBulletContinuation = Boolean(
          currentRole &&
          currentRole.bullets.length > 0 &&
          (
            /^[a-z]/.test(line) ||
            /^(?:and|or|for|with|of|to|in|by|including|supporting|across|the|an|a)\b/i.test(line) ||
            line.endsWith(".") ||
            (!dateMatch && !/(?:—|–|-|\bat\b|@|\|)/.test(line) && !/(?:Engineer|Developer|Lead|Head|Intern|Manager|Architect|Consultant|Analyst|Director|Associate|President|Coordinator)\b/i.test(line))
          )
        );

        if (isBulletContinuation && currentRole) {
          const lastIdx = currentRole.bullets.length - 1;
          currentRole.bullets[lastIdx] = `${currentRole.bullets[lastIdx]} ${line}`.replace(/\s{2,}/g, " ").trim();
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

        const separatorMatch = title.match(/^(.+?)\s+(?:at|@|\||,|—|–)\s+(.+)$/i);
        if (separatorMatch) {
          title = separatorMatch[1].trim();
          org = separatorMatch[2].trim();
        } else if (i + 1 < lines.length && !lines[i + 1].match(/^[•\-\*]/) && !lines[i + 1].match(datePattern) && lines[i + 1].length < 75 && !lines[i + 1].startsWith("===")) {
          const nextLine = lines[i + 1];
          const nextSepMatch = nextLine.match(/^(.+?)\s*(?:—|–|-|at|@)\s*(.+)$/i);
          if (nextSepMatch) {
            title = `${title} / ${nextSepMatch[1].trim()}`;
            org = nextSepMatch[2].trim();
          } else {
            org = nextLine;
          }
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
        const bulletText = line.replace(/^[•\-\*]\s*/, "");
        // Check if an embedded role heading was attached to this bullet line
        const embeddedRoleMatch = bulletText.match(
          new RegExp(`(?:^|[.\\n])\\s*\\b((?:Senior\\s+|Junior\\s+|Lead\\s+|Head\\s+of\\s+|Public\\s+Relations[A-Za-z0-9\\s&,/.-]*?|Cybersecurity\\s+Intern\\s*[/|\\s]+\\s*)?[A-Z][A-Za-z0-9\\s&/.-]{1,55}?\\b(?:Head|Lead|Intern|Manager|Developer|Engineer|Architect|Director|President|Coordinator|Officer|Analyst|Consultant|Specialist|Associate))\\s*(?:—|–|-|at|@)\\s*([A-Za-z0-9\\s&().,-]+?)(?:\\s+(?:Lead|Manage|Drive|Promote|Secure|Oversee|Served|Organised|Organized|Built|Developed|Engineered|Coordinating|Building|Serving|Coordinated|Led|Designed|Created|Implemented)\\b|$)`, "i")
        );
        if (embeddedRoleMatch && embeddedRoleMatch.index !== undefined) {
          const priorText = bulletText.substring(0, embeddedRoleMatch.index).trim();
          if (priorText) {
            currentRole.bullets.push(priorText);
          }
          if (currentRole.bullets.length > 0 || currentRole.startDate || currentRole.organization) {
            results.push(this.formatExperienceRole(currentRole));
          }
          const newRoleTitle = embeddedRoleMatch[1].trim();
          const newRoleOrg = embeddedRoleMatch[2].trim();
          const remainder = bulletText.substring(embeddedRoleMatch.index + embeddedRoleMatch[0].length).trim();
          currentRole = {
            title: newRoleTitle,
            organization: newRoleOrg,
            bullets: remainder ? [remainder] : [],
            rawLines: [bulletText],
          };
          continue;
        }

        currentRole.bullets.push(bulletText);
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
    const datePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b\d{4}\b|present|current)/i;

    // If role has no date yet, check if any of the bullets contains a trailing date range like "July 2026 - Present"
    if (!role.startDate) {
      for (let b = finalBullets.length - 1; b >= 0; b--) {
        const bulletDateMatch = finalBullets[b].match(datePattern);
        if (bulletDateMatch) {
          role.startDate = bulletDateMatch[2];
          role.endDate = bulletDateMatch[4]?.toLowerCase() === "present" ? undefined : bulletDateMatch[4];
          role.isCurrent = /present|current/i.test(bulletDateMatch[4] || "");
          finalBullets[b] = finalBullets[b].replace(datePattern, "").replace(/[,—–-]\s*$/, "").trim();
          break;
        }
      }
    }

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
          .replace(/(?:\|\s*)?(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:linkedin|github)\.com\S*|https?:\/\/\S*).*$/i, "")
          .replace(datePattern, "")
          .replace(/[,—–-]\s*$/, "")
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
    const degreePattern = /\b(bachelor|master|phd|doctorate|associate|diploma|engineering|higher\s+secondary|icse|cbse|hsc|ssc|\d{1,2}th\s+grade|b\.?tech\b|m\.?tech\b|b\.?e(?:\.|\b)|m\.?e(?:\.|\b)|b\.?s(?:\.|\b)|m\.?s(?:\.|\b)|b\.?a(?:\.|\b))/i;

    const fullText = lines.join(" ");
    const institutionSplitRegex = /(?<=(?:Present|\b\d{4}\b|\)\s*|Science|Commerce|Arts|Engineering|\bGrade\b))\s+(?=[A-Z][A-Za-z0-9\s.()]{2,50}\b(?:College|University|School|Institute|Academy)\b)/gi;

    let effectiveLines = lines;
    if (lines.length <= 2 && institutionSplitRegex.test(fullText)) {
      effectiveLines = fullText.split(institutionSplitRegex).map((s) => s.trim()).filter(Boolean);
    }

    if (effectiveLines.length > 1) {
      for (const rawLine of effectiveLines) {
        const line = rawLine.replace(/^[•\-\*]\s*/, "").trim();
        if (line.length < 5) continue;

        const dashMatch = line.match(/^(.+?)\s*(?:—|–|-)\s*(.+)$/);
        if (dashMatch) {
          let partA = dashMatch[1].trim();
          let partB = dashMatch[2].trim();

          const rangeMatch = (partB.match(rangePattern) || partA.match(rangePattern));
          let startDate: string | null = null;
          let endDate: string | null = null;
          let isCurrent = false;

          if (rangeMatch) {
            startDate = rangeMatch[2];
            const endRaw = rangeMatch[4];
            endDate = endRaw && /present|current/i.test(endRaw) ? null : endRaw;
            isCurrent = Boolean(endRaw && /present|current/i.test(endRaw));
          } else {
            const yearMatches = (partB.match(/\b(?:19|20)\d{2}\b/g) || partA.match(/\b(?:19|20)\d{2}\b/g) || []);
            startDate = (yearMatches.length > 1 ? yearMatches[0] : null) ?? null;
            endDate = yearMatches.at(-1) ?? null;
          }

          partB = partB.replace(rangePattern, "").replace(yearPattern, "").trim();
          partA = partA.replace(rangePattern, "").replace(yearPattern, "").trim();

          let institution = partA;
          let degree = partB;

          if (degreePattern.test(partA) && /(?:College|University|School|Institute|Academy)/i.test(partB)) {
            institution = partB;
            degree = partA;
          }

          if (institution && degree) {
            results.push({
              entryType: "education",
              title: degree,
              organization: institution,
              startDate,
              endDate,
              isCurrent,
              bullets: [],
              confidence: 0.95,
              rawSnippet: line,
            });
            continue;
          }
        }
      }

      if (results.length > 0) {
        return results;
      }
    }

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
          const parts = titleOrSchool.split(/(?=B\s*\.?\s*Tech\b|M\s*\.?\s*Tech\b|B\s*\.?\s*E(?:\.|\b)|M\s*\.?\s*E(?:\.|\b)|Bachelor|Master|Associate|Diploma)/i);
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

    // Fallback: single-line continuous text (e.g. Fr. Conceicao Rodrigues College ... B.Tech. in Computer Engineering)
    const degreeMatch = fullText.match(/\b(B\s*\.?\s*Tech\b|M\s*\.?\s*Tech\b|B\s*\.?\s*E(?:\.|\b)|Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.)(?:\s+in\s+([A-Za-z\s&]+))?/i);
    const dateMatch = fullText.match(/(?:expected\s+)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b20\d{2}\b)/i);

    if (degreeMatch || fullText.includes("Engineering") || fullText.includes("College") || fullText.includes("University")) {
      let institution = lines[0] || "University";
      let degree = degreeMatch ? degreeMatch[0] : "Degree";

      if (fullText.includes("College") || fullText.includes("University") || fullText.includes("Institute")) {
        const parts = fullText.split(/(?=B\s*\.?\s*Tech\b|M\s*\.?\s*Tech\b|B\s*\.?\s*E(?:\.|\b)|Bachelor|Master|Associate)/i);
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
    // Split projects on title patterns: "Project Name — Subtitle", "Project Name App Developed...", or standalone title followed by action sentence
    const projSegments = fullText.split(
      /(?:^|\n|(?<=\.)\s+)(?=(?:[A-Za-z0-9\s&()/-]{2,55}\s*—\s*[A-Za-z0-9\s&()/-]{2,50}|[A-Za-z0-9\s]{2,40}?\b(?:App|Platform|System|Engine|Bot|Tool|Portal|Assistant|Website|Dashboard|Tracker)\b\s+(?:Developed|Built|Designed|Created|Implemented)\b|[A-Za-z0-9\s&()/-]{3,55}?\b(?:Engine|App|Platform|System|Bot|Tool|Portal|Assistant|Dashboard|Tracker)\b(?:\s*\([^)]+\))?\s*\n\s*(?:Designed|Built|Developed|Engineered|Implemented|Created)\b))/i
    );

    if (projSegments.length > 1 || (projSegments.length === 1 && (projSegments[0].includes("—") || projSegments[0].includes(" | ")))) {
      for (const segment of projSegments) {
        const segLines = segment.split("\n").map((l) => l.trim()).filter(Boolean);
        if (segLines.length === 0) continue;

        let firstLine = segLines[0].replace(/^(?:ADDITIONAL INFORMATION|PROJECTS|KEY PROJECTS|PROJECTS & PRODUCTION BUILDS)\s+/i, "");
        let title = firstLine;
        let techLine = "";
        let embeddedActionBullet: string | null = null;

        const nameAndActionMatch = firstLine.match(
          /^([A-Z][A-Za-z0-9\s]{2,35}?\b(?:App|Platform|System|Engine|Bot|Tool|Portal|Assistant|Website|Dashboard|Tracker))\s+((?:Developed|Built|Designed|Created|Implemented)\b.*)$/i
        );
        if (nameAndActionMatch) {
          title = nameAndActionMatch[1].trim();
          embeddedActionBullet = nameAndActionMatch[2].trim();
        } else {
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
        }

        const bullets: string[] = [];
        if (embeddedActionBullet) {
          bullets.push(embeddedActionBullet);
        }

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
      "Databases & Cloud",
      "Databases / Cloud",
      "Databases & Tools",
      "Databases & Technologies",
      "Databases & Storage",
      "Databases",
      "Database Systems",
      "Programming Languages",
      "Languages & Frameworks",
      "Languages & Tools",
      "Languages",
      "Frontend / Mobile",
      "Frontend & Mobile",
      "Frontend Technologies",
      "Frontend",
      "Mobile Technologies",
      "Mobile App Development",
      "Mobile Development",
      "Mobile",
      "Backend / APIs",
      "Backend & APIs",
      "Backend Technologies",
      "Backend",
      "APIs & Microservices",
      "APIs & Services",
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
      "Tools & Others",
      "Tools & Other",
      "Tools / Others",
      "Developer Tools",
      "Tools",
      "Platforms",
      "Methodologies & Practices",
      "Core Competencies",
      "Soft Skills",
    ];

    categoryKeywords.sort((a, b) => b.length - a.length);

    let fullText = lines.join("\n")
      .replace(/\s*&\s*/g, " & ")
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s*\|\s*/g, " | ")
      .replace(/[ \t]{2,}/g, " ");

    // Step 1: Colon-delimited category marker (horizontal whitespace only)
    fullText = fullText.replace(
      /(?:^|\n|[|;])[ \t]*([A-Z][A-Za-z0-9 \t/&+,-]{1,35})[ \t]*:[ \t]*(?=[A-Za-z0-9\n])/g,
      "\n===CAT:$1===\n"
    );

    // Step 2: Category keywords without colons (at line start, delimiter, or inline)
    for (const cat of categoryKeywords) {
      const escaped = cat
        .replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")
        .replace(/\s*\\&\s*/g, "\\s*&\\s*")
        .replace(/\s+/g, "\\s+");

      fullText = fullText.replace(
        new RegExp(`(^|\\n|[|;]|(?<=[A-Za-z0-9+/.)\\]]))[ \\t]*\\b(${escaped})\\b[ \\t]*(?::|(?=[A-Za-z0-9\\n]))`, "gi"),
        (match, prefix, categoryName, offset, fullStr) => {
          const before = fullStr.substring(Math.max(0, offset - 10), offset);
          if (before.includes("===CAT:")) return match;
          return `\n===CAT:${categoryName}===\n`;
        }
      );
    }

    const pieces = fullText.split(/===CAT:\s*([^=]+)===/);
    const results: StructuredResumeSection[] = [];

    if (pieces.length > 1) {
      for (let i = 1; i < pieces.length; i += 2) {
        const category = pieces[i].trim();
        const rawSkills = pieces[i + 1]?.trim() || "";
        const cleanRaw = rawSkills.replace(/^[:—–-]\s*/, "");

        let rawItems: string[] = [];
        if (cleanRaw.includes("|")) {
          rawItems = cleanRaw.split(/\|/);
        } else if (cleanRaw.includes(",") && !cleanRaw.includes("\n•")) {
          rawItems = cleanRaw.split(/,/);
        } else {
          rawItems = cleanRaw.split(/[,|•·;\n]\s*|\s{2,}/);
        }

        const skillList = rawItems
          .map((s) => s.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim().replace(/^[:•\-\*]\s*/, ""))
          .filter((s) => s.length > 0 && !categoryKeywords.some((ck) => ck.toLowerCase() === s.toLowerCase()))
          .filter((s) => !/^(Soft|Hard|Technical|Core)$/i.test(s));

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
        const skills = parts[1].split(/[,|•·;]\s*/).map((s) => s.trim()).filter(Boolean).filter((s) => !/^(Soft|Hard|Technical|Core)$/i.test(s));
        if (skills.length > 0) {
          results.push({
            entryType: "skill_group",
            title: cat || "Technical Skills",
            bullets: skills,
            confidence: 0.9,
            rawSnippet: line,
          });
        }
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
   * Auto-balances unclosed brackets and cleans extra bracket whitespace
   */
  static balanceBrackets(text: string): string {
    if (!text) return text;
    let res = text.trim();
    // Auto-balance unclosed brackets before delimiter or end: e.g. "[ Pixels Sies |" -> "[ Pixels Sies ] |"
    res = res.replace(/\[([^\]\n|;]+)(?=\s*(?:\||;|\n|$))/g, (m, p1) => `[ ${p1.trim()} ]`);
    const openCount = (res.match(/\[/g) || []).length;
    const closeCount = (res.match(/\]/g) || []).length;
    if (openCount > closeCount) {
      res = res + " ]".repeat(openCount - closeCount);
    }
    res = res.replace(/\[\s*\[/g, "[").replace(/\]\s*\]/g, "]");
    res = res.replace(/\[\s+/g, "[ ").replace(/\s+\]/g, " ]");
    return res.trim();
  }

  /**
   * Parses combined certification and achievement sections, splitting into certifications and awards
   */
  private static parseCertificationAndAchievementBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const mergedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].trim();
      if (!l) continue;
      // If line is an award qualifier like "Winner", "Runner Up", "Rank 1", merge with following line
      if (/^(Winner|Runner\s*Up|Finalist|1st\s*Place|2nd\s*Place|3rd\s*Place|Rank\s*\d+|Top\s*\d+|Champion|Gold\s*Medalist)$/i.test(l) && i + 1 < lines.length) {
        mergedLines.push(`${l} - ${lines[i + 1].trim()}`);
        i++;
        continue;
      }
      mergedLines.push(l);
    }

    for (const item of mergedLines) {
      let clean = item.replace(/^[•\-\*]\s*/, "").trim();
      clean = this.balanceBrackets(clean);
      if (clean.length < 3) continue;

      const isAward = /Winner|Runner|Rank|Place|Award|Hackathon|Prize|Gold|Silver|Bronze|Honor|Champion|Finalist/i.test(clean);
      if (isAward) {
        results.push({
          entryType: "award",
          title: clean,
          bullets: [clean],
          confidence: 0.92,
          rawSnippet: clean,
        });
      } else {
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

    return results;
  }

  /**
   * Parses certifications
   */
  private static parseCertificationBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    for (const line of lines) {
      const items = line.split(/[,|•·;]\s*(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        let clean = item.replace(/^[•\-\*]\s*/, "").trim();
        clean = this.balanceBrackets(clean);
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
    return sections.map((sec) => {
      const isWorkOrEdu = sec.entryType === "experience" || sec.entryType === "education" || sec.entryType === "volunteer";
      return {
        entryType: sec.entryType,
        rawSnippet: sec.rawSnippet,
        parsedDataJson: {
          title: this.balanceBrackets(sec.title),
          organization: sec.organization || null,
          location: sec.location || null,
          startDate: sec.startDate || null,
          endDate: sec.endDate || null,
          isCurrent: Boolean(sec.isCurrent && isWorkOrEdu),
          descriptionContext: sec.descriptionContext || null,
          bullets: (sec.bullets || []).map((b) => this.balanceBrackets(b)),
        },
        confidence: sec.confidence,
      };
    });
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

