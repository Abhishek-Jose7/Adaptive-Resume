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
   * Shared date range pattern supporting:
   * - Month YYYY - Month YYYY | Present | Current | Ongoing | Till Date | Now
   * - MM/YYYY - MM/YYYY | Present
   * - YYYY.MM - YYYY.MM | Present
   * - YYYY - YYYY | Present | Current
   * - Month 'YY - Month 'YY
   */
  private static readonly DATE_RANGE_REGEX =
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[ \t]+)?(?:(?:\d{1,2}[/.])?(?:19|20)\d{2}|'\d{2})[ \t]*(?:-|–|—|to)[ \t]*(?:(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[ \t]+)?(?:(?:\d{1,2}[/.])?(?:19|20)\d{2}|'\d{2})|present|current|ongoing|now|till\s*date|to\s*date)/i;

  private static readonly ACTION_VERBS_LIST = [
    "Lead", "Leading", "Manage", "Managing", "Drive", "Driving", "Promote", "Promoting",
    "Secure", "Securing", "Oversee", "Overseeing", "Served", "Serving", "Organised", "Organized",
    "Built", "Building", "Developed", "Developing", "Engineered", "Engineering",
    "Coordinating", "Coordinated", "Led", "Designed", "Designing", "Created", "Creating",
    "Implemented", "Implementing", "Spearheaded", "Spearheading", "Architected", "Architecting",
    "Directed", "Supervised", "Coordinate", "Conduct", "Conducted", "Research", "Researched",
    "Automated", "Deployed", "Configured", "Containerized", "Reduced", "Increased", "Improved",
    "Accelerated", "Optimized", "Optimizing", "Streamlined", "Integrated", "Integrating",
    "Migrated", "Maintained", "Monitored", "Refactored", "Resolved", "Scaled", "Trained",
    "Transformed", "Upgraded", "Validated", "Wrote", "Authored", "Launched", "Delivered",
    "Established", "Executed", "Expanded", "Facilitated", "Generated", "Mentored", "Pioneered",
    "Produced", "Published", "Analyzed", "Analysed", "Assessed", "Audited", "Collaborated",
    "Formulated", "Handled", "Handled", "Handled", "Evaluated", "Constructed", "Tested",
  ];

  private static readonly ROLE_KEYWORDS_REGEX =
    /\b(?:Engineer|Developer|Architect|Intern|Internship|Lead|Leader|Head|Manager|Director|Analyst|Consultant|Designer|Researcher|Scientist|Associate|Coordinator|Specialist|Administrator|Founder|Co-Founder|CTO|CEO|VP|President|Officer|Fellow|Instructor|Tutor|Teaching\s+Assistant|TA|SRE|DevOps|Volunteer|Member|Representative|Editor)\b/i;

  private static readonly ORG_KEYWORDS_REGEX =
    /\b(?:Inc|LLC|Ltd|LLP|Corp|Corporation|Technologies|Technology|Tech|Labs|Solutions|Systems|University|College|School|Institute|Academy|Studio|Group|Bank|Capital|Ventures|Foundation|Association|Society|Council|Club|GDG|GDSC|FRCRCE|Google|Microsoft|Amazon|Meta|Apple)\b/i;

  private static readonly LOCATION_LINE_REGEX =
    /^(?:Remote|Hybrid|On-?site|Work\s+from\s+Home|(?:[A-Z][A-Za-z.\s]{1,30},\s*(?:[A-Z]{2}|India|USA|United\s+States|UK|United\s+Kingdom|Canada|Germany|Singapore|Australia|UAE|France|Netherlands|Japan|[A-Z][a-z]{2,20})(?:\s*\d{5,6})?))$/i;

  /**
   * Splits a delimited string while preserving commas/pipes inside () or [] parentheses.
   */
  private static splitRespectingParens(input: string, extraSplitOnDoubleSpace = true): string[] {
    const items: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "(" || ch === "[") {
        depth++;
        current += ch;
        continue;
      }
      if (ch === ")" || ch === "]") {
        depth = Math.max(0, depth - 1);
        current += ch;
        continue;
      }

      const isDelimiterChar = ch === "," || ch === "|" || ch === "•" || ch === "·" || ch === ";" || ch === "\n";
      const isDoubleSpace =
        extraSplitOnDoubleSpace &&
        ch === " " &&
        input[i + 1] === " " &&
        depth === 0;

      if (depth === 0 && (isDelimiterChar || isDoubleSpace)) {
        const trimmed = current.trim();
        if (trimmed) items.push(trimmed);
        current = "";
        if (isDoubleSpace) {
          while (i + 1 < input.length && input[i + 1] === " ") i++;
        }
        continue;
      }

      current += ch;
    }

    const tail = current.trim();
    if (tail) items.push(tail);
    return items;
  }

  /**
   * Parses a matched date range string into normalized startDate, endDate, isCurrent.
   */
  private static parseDateRangeMatch(rangeStr: string): {
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
  } {
    const parts = rangeStr.split(/\s*(?:-|–|—|\bto\b)\s*/i).map((p) => p.trim()).filter(Boolean);
    const startRaw = parts[0] || null;
    const endRaw = parts.length > 1 ? parts[parts.length - 1] : null;
    const isCurrent = Boolean(endRaw && /^(?:present|current|ongoing|now|till\s*date|to\s*date)$/i.test(endRaw));

    return {
      startDate: startRaw,
      endDate: isCurrent ? null : endRaw,
      isCurrent,
    };
  }

  /**
   * Extracts candidate contact information (Name, Email, Phone, Location, Headline, Links)
   * from the resume header (or sidebar/footer if contact block appears later in stream),
   * separating it cleanly from the professional summary.
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
    const cleanForContact = rawText
      .replace(/([a-zA-Z0-9_%+-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9_%+-]+)*)[ \t]*@[ \t]*([a-zA-Z0-9-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9-]+)*)[ \t]*\.[ \t]*([a-zA-Z]{2,})/g, (m) =>
        m.replace(/[ \t]+/g, "")
      )
      .replace(/https?[ \t]*:[ \t]*\/\/[ \t]*/gi, "https://")
      .replace(/(?:www[ \t]*\.[ \t]*)?(github|linkedin|gitlab|leetcode|kaggle|behance|dribbble|medium|huggingface)[ \t]*\.[ \t]*(com|io|org|in|net|co)(?:[ \t]*\/[ \t]*[^\s|•,;]+)*/gi, (m) =>
        m.replace(/[ \t]+/g, "")
      )
      .replace(/((?:github|linkedin)\.com\/[^\s]+?)[ \t]*-[ \t]+([^\s]+)/gi, "$1-$2");

    const topSlice = cleanForContact.substring(0, 1600);
    const topHasContact =
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i.test(topSlice) ||
      /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{4,5}/.test(topSlice);

    const searchRegion = topHasContact ? topSlice : cleanForContact;

    const emailMatch = searchRegion.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);

    let phone: string | null = null;
    const phoneCandidates = searchRegion.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g) || [];
    for (const candidate of phoneCandidates) {
      const digits = candidate.replace(/\D/g, "");
      // Reject year ranges like 2024-2028 (8 digits starting with 19/20)
      if (/^(?:19|20)\d{2}[\s.-]*(?:19|20)\d{2}$/.test(candidate.trim())) continue;
      if (digits.length >= 10 && digits.length <= 15) {
        phone = candidate.trim();
        break;
      }
    }

    if (!emailMatch && !phone) {
      return null;
    }

    const email = emailMatch ? emailMatch[1].trim() : null;

    // Links: github, linkedin, developer profiles, and personal portfolio sites
    const linkMatches =
      searchRegion.match(
        /(?:https?:\/\/(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?::\d+)?(?:\/[^\s|•,;)>\]"']*)?|(?:www\.)?(?:github\.com|linkedin\.com\/in|gitlab\.com|leetcode\.com|kaggle\.com|hackerrank\.com|behance\.net|dribbble\.com|huggingface\.co|medium\.com|x\.com|twitter\.com)\/[A-Za-z0-9_@.-]+|[a-zA-Z0-9-]+\.(?:dev|me|io|ai|vercel\.app|netlify\.app|github\.io)(?:\/[A-Za-z0-9_.-]*)?)/gi
      ) || [];

    const emailDomain = email ? email.split("@")[1]?.toLowerCase() : "";
    const seenLinks = new Set<string>();
    const links: string[] = [];
    for (const rawLink of linkMatches) {
      const cleanedLink = rawLink.trim().replace(/[.,;)>\]"']+$/, "");
      const lowerNoProto = cleanedLink.replace(/^https?:\/\/(?:www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
      if (!lowerNoProto || (emailDomain && lowerNoProto === emailDomain)) continue;
      if (email && cleanedLink.toLowerCase().includes(email.toLowerCase())) continue;
      if (!seenLinks.has(lowerNoProto)) {
        seenLinks.add(lowerNoProto);
        links.push(cleanedLink);
      }
    }

    // Location
    const locMatch = searchRegion.match(
      /(?:(?:Location|Address|Based\s+in)\s*:\s*([A-Z][A-Za-z.\s,]{2,45})|\b([A-Z][A-Za-z.\s]{1,25},\s*(?:India|USA|United\s+States|UK|United\s+Kingdom|Canada|Germany|Singapore|Australia|UAE|Karnataka|Maharashtra|Delhi|Telangana|Tamil\s+Nadu|[A-Z]{2})(?:\s*\d{5,6})?|[A-Z][a-zA-Z\s]{2,20}\s+\d{5,6}))\b/i
    );
    let location = locMatch ? (locMatch[1] || locMatch[2] || "").trim() : null;
    if (location) {
      // Strip leading role/title words if attached without separator (e.g. "Frontend Developer Mumbai, India")
      location = location.replace(/^(?:.*?\b(?:Developer|Engineer|Designer|Analyst|Architect|Lead|Manager|Student)\s+)/i, "").trim();
    }

    // Candidate name: extract from top lines or top segment before first bullet / pipe / section marker
    let name: string | null = null;
    let headline: string | null = null;

    const topNonEmptyLines = topSlice
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^(?:RESUME|CURRICULUM\s+VITAE|CV|BIO|PERSONAL\s+PROFILE)$/i.test(l));

    const firstLine = topNonEmptyLines[0] || "";
    const firstSegment = firstLine.split(/(?:•|\||===SECTION)/)[0].trim();

    // Case 1: ALL CAPS name immediately followed by Title Case headline on same line (e.g. "JOHANN JOSEPH Cloud Security")
    const capsNameAndRest = firstSegment.match(/^([A-Z]{2,}(?:\s+[A-Z]{1,15}){1,3})\s+([A-Z][a-z].*)$/);
    if (capsNameAndRest && !/^(?:RESUME|PROFILE|SUMMARY|EXPERIENCE|EDUCATION|SKILLS)/i.test(capsNameAndRest[1])) {
      name = capsNameAndRest[1].trim();
      const trailingPipeRest = firstLine.substring(capsNameAndRest[1].length).trim();
      const headlineCandidate = trailingPipeRest.split(/(?:\bMumbai\b|\bIndia\b|\d{5,}|\+?\d{10}|@|github|linkedin)/i)[0].replace(/\|\s*$/, "").trim();
      if (headlineCandidate.length > 3 && headlineCandidate.length < 90) {
        headline = headlineCandidate;
      }
    } else if (
      /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'.\s-]{2,45}$/.test(firstSegment) &&
      !/^(?:Resume|Curriculum|Profile|Summary|Professional|Work\s+Experience|Technical\s+Skills|Education|Projects)/i.test(firstSegment) &&
      firstSegment.split(/\s+/).length <= 5
    ) {
      name = firstSegment;
    } else {
      const nameMatch = searchRegion.match(/(?:^|\n)\s*([A-Z][A-Z\s]{2,35})(?=\s*(?:•|\||\n|\d|\+))/);
      if (nameMatch && !/^(?:RESUME|PROFILE|SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS)/i.test(nameMatch[1].trim())) {
        name = nameMatch[1].trim();
      }
    }

    // Headline: Look for student/role/engineer phrase in header before summary
    if (!headline) {
      const headlineMatch = searchRegion.match(/(?:•|\||\n)\s*([A-Za-z0-9\s/&,.-]{4,75}?\b(?:Student|Engineer|Developer|Analyst|Designer|Architect|Lead|Manager|Researcher|Scientist))\s*(?:•|\||\n|$)/i);
      if (headlineMatch) {
        const candidateHeadline = headlineMatch[1].trim();
        if (!candidateHeadline.includes("@") && !candidateHeadline.includes("http") && candidateHeadline !== name) {
          headline = candidateHeadline;
        }
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

    const sectionHeadingRegex =
      /^(?:===SECTION:\s*([^=]+)===|(?:professional\s+summary|career\s+summary|executive\s+summary|career\s+objective|objective|overview|summary|profile|personal\s+profile|about\s*me|work\s*experience|work\s*history|professional\s*experience|relevant\s*experience|industry\s*experience|internship\s*experience|internships|experience|employment(?:\s*history)?|career\s+history|research\s*experience|education(?:\s*(?:&|and)\s*training)?|academic(?:\s*(?:history|background|qualifications|credentials))?|qualifications|projects\s*&\s*production\s*builds|projects\s*&\s*builds|technical\s*projects|personal\s*projects|key\s*projects|selected\s*projects|academic\s*projects|software\s*projects|side\s*projects|projects|open\s*source|technical\s*&\s*core\s*skills|technical\s*skills|core\s*skills|skills\s*(?:&|and)\s*expertise|skills\s*summary|skills|core\s+competencies|competencies|areas\s+of\s+expertise|tech(?:nology)?\s+stack|certifications?\s*(?:&|\/|and)\s*achievements?|achievements?\s*(?:&|\/|and)\s*certifications?|certifications?\s*(?:&|\/|and)\s*licenses?|certifications?\s*(?:&|\/|and)\s*courses?|professional\s*certifications?|certifications?|certificates?|licenses?|awards?\s*(?:&|\/|and)\s*honors?|honors?\s*(?:&|\/|and)\s*awards?|awards?\s*(?:\/|&|and)\s*activities|achievements?|accomplishments?|key\s*achievements?|awards?|honors?|hackathons?|publications?|research\s*(?:&|and)\s*publications?|patents?|volunteering|volunteer(?:\s*(?:work|experience))?|positions\s+of\s+responsibility|leadership\s*(?:&|and)?\s*(?:activities|experience)?|extra-?curricular\s+activities|co-?curricular\s+activities|additional\s+information|languages|spoken\s*languages)(?:\s*[:—–-])?)$/i;

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

      const isHeaderCandidate =
        line.length < 55 &&
        sectionHeadingRegex.test(line) &&
        !(/SKILL/i.test(currentHeading) && /^(?:languages|tools|frameworks|databases|cloud|platforms|libraries|technologies)$/i.test(line.replace(/[:—–-]$/, "").trim()));

      if (isHeaderCandidate) {
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

      if (/SUMMARY|PROFILE|ABOUT|OBJECTIVE|OVERVIEW/i.test(heading)) {
        const hasDates = secLines.some((l) => this.DATE_RANGE_REGEX.test(l));
        const hasBullets = secLines.some((l) => /^[•\-\*]\s+/.test(l));

        if (heading === "PROFILE" && (hasDates || (hasBullets && secLines.some((l) => this.ROLE_KEYWORDS_REGEX.test(l))))) {
          const expEntries = this.parseExperienceBlocks(secLines);
          structuredResults.push(...expEntries);
          continue;
        }

        // Exclude contact information, phone, email, and candidate header links from the summary
        const nonContactLines = secLines.filter((l) => {
          if (/@|github\.com|linkedin\.com|\b\d{10}\b|portfolio|https?:\/\//i.test(l)) return false;
          if (/\b(?:Email|Phone|Mobile|Tel|LinkedIn|GitHub|Portfolio|Website|Address|Location)\s*:/i.test(l)) return false;
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
      } else if (/EXPERIENCE|EMPLOYMENT|INTERNSHIP|WORK\s*HISTORY|CAREER\s*HISTORY/i.test(heading)) {
        const expEntries = this.parseExperienceBlocks(secLines);
        structuredResults.push(...expEntries);
      } else if (/EDUCATION|ACADEMIC|QUALIFICATIONS/i.test(heading)) {
        const eduEntries = this.parseEducationBlocks(secLines);
        structuredResults.push(...eduEntries);
      } else if (/PROJECT|OPEN\s*SOURCE|PRODUCTION\s*BUILDS/i.test(heading)) {
        const projEntries = this.parseProjectBlocks(secLines);
        structuredResults.push(...projEntries);
      } else if (/SKILL|COMPETENC|EXPERTISE|TECH(?:NOLOGY)?\s*STACK|TECHNOLOGIES/i.test(heading)) {
        const dateLineIdx = secLines.findIndex((l) => this.DATE_RANGE_REGEX.test(l));
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
      } else if (/CERTIF|LICENSE|COURSES/i.test(heading)) {
        const certEntries = this.parseCertificationBlocks(secLines);
        structuredResults.push(...certEntries);
      } else if (/AWARD|HONOR|ACHIEVE|ACCOMPLISH|HACKATHON/i.test(heading)) {
        // Merge wrapped lines (e.g. unclosed brackets or lowercase sentence continuation)
        const mergedLines: string[] = [];
        for (const rawLine of secLines) {
          const l = rawLine.trim();
          if (!l) continue;
          if (mergedLines.length > 0 && !/^[•\-\*]\s+/.test(l)) {
            const prev = mergedLines[mergedLines.length - 1];
            const prevOpen = (prev.match(/\[|\(/g) || []).length > (prev.match(/\]|\)/g) || []).length;
            if (prevOpen || /[,|–—\-]$/.test(prev) || /^[\]\),|]/.test(l) || /^[a-z0-9]/.test(l)) {
              mergedLines[mergedLines.length - 1] = `${prev} ${l}`.replace(/\s{2,}/g, " ");
              continue;
            }
            if (/^(Winner|Runner\s*Up|Finalist|1st\s*Place|2nd\s*Place|3rd\s*Place|Rank\s*\d+|Top\s*\d+|Champion|Gold\s*Medalist)$/i.test(prev.replace(/^[•\-\*]\s*/, ""))) {
              mergedLines[mergedLines.length - 1] = `${prev} - ${l}`;
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
        const langItems = this.splitRespectingParens(secLines.join(" "), false)
          .map((s) => s.replace(/^[:•\-\*]\s*/, "").trim())
          .filter(Boolean);
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
          const langItems = this.splitRespectingParens(secText, false)
            .map((s) => s.replace(/^[:•\-\*]\s*/, "").trim())
            .filter(Boolean);
          if (langItems.length > 0) {
            structuredResults.push({
              entryType: "skill_group",
              title: /english|hindi|spanish|french|german|mandarin|marathi|malayalam|tamil|telugu/i.test(secText) ? "Languages (Spoken)" : "Languages",
              bullets: langItems,
              confidence: 0.95,
              rawSnippet: secLines.join(", "),
            });
          }
        }
      } else if (/VOLUNTEER|LEADERSHIP|POSITIONS\s+OF\s+RESPONSIBILITY|ACTIVITIES|CLUBS/i.test(heading)) {
        const volEntries = this.parseExperienceBlocks(secLines).map((e) => ({
          ...e,
          entryType: "volunteer" as const,
        }));
        if (volEntries.length > 0) {
          structuredResults.push(...volEntries);
        } else {
          structuredResults.push({
            entryType: "volunteer",
            title: secLines[0]?.replace(/^[•\-\*]\s*/, "") || "Volunteer & Leadership",
            bullets: secLines.map((l) => l.replace(/^[•\-\*]\s*/, "")).filter(Boolean),
            confidence: 0.85,
            rawSnippet: secLines.join("\n").substring(0, 250),
          });
        }
      } else if (/PUBLICATION|PATENT|RESEARCH/i.test(heading)) {
        for (const line of secLines) {
          const clean = line.replace(/^[•\-\*]\s*/, "").trim();
          if (clean.length > 10) {
            structuredResults.push({
              entryType: "custom",
              title: clean.length > 90 ? `${clean.slice(0, 87)}...` : clean,
              organization: "Publication / Research",
              bullets: [clean],
              confidence: 0.85,
              rawSnippet: clean,
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

    // Deduplicate bullets within each section and filter empty noise
    const cleanedResults = structuredResults
      .map((sec) => {
        const seenB = new Set<string>();
        const dedupedBullets = (sec.bullets || [])
          .map((b) => this.balanceBrackets(b.replace(/[ \t]{2,}/g, " ").trim()))
          .filter((b) => {
            if (!b || /^[-–—|•·*]+$/.test(b)) return false;
            const key = b.toLowerCase();
            if (seenB.has(key)) return false;
            seenB.add(key);
            return true;
          });
        return {
          ...sec,
          title: this.balanceBrackets(sec.title.replace(/[ \t]{2,}/g, " ").trim()),
          bullets: dedupedBullets,
        };
      })
      .filter((sec) => sec.title.length > 0);

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

    return cleanedResults.sort((a, b) => {
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
   * Pre-normalizes unstructured raw text: repairs PDF glyph splits, spaced emails/URLs,
   * spaced-out headers, Unicode/PUA bullets, wrapped section titles, and inline headings.
   */
  static preNormalizeResumeText(text: string): string {
    let cleaned = text.replace(/^(?:Professional Summary|profile|\d+%\s*match)\s*$/gim, "");

    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, " — ")
      .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ");

    // Strip horizontal rules / ASCII borders
    cleaned = cleaned.replace(/^[ \t]*[-_=*~]{4,}[ \t]*$/gm, "");

    // Collapse spaced-out ALL CAPS headings like "E X P E R I E N C E" -> "EXPERIENCE"
    cleaned = cleaned.replace(
      /(?:^|\n)[ \t]*((?:[A-Z][ \t]){3,}[A-Z])(?=[ \t]*(?:\n|$|:))/g,
      (_m, spaced: string) => `\n${spaced.replace(/[ \t]+/g, "")}`
    );

    // Strip non-bullet Private-Use Area icons (FontAwesome/Material/Wingdings contact icons)
    cleaned = cleaned.replace(/[\uE000-\uF0A6\uF0A8-\uF0B6\uF0B8-\uF8FF]/g, " ");

    // Fix spaced emails and URLs broken across PDF runs
    cleaned = cleaned
      .replace(/([a-zA-Z0-9_%+-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9_%+-]+)*)[ \t]*@[ \t]*([a-zA-Z0-9-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9-]+)*)[ \t]*\.[ \t]*([a-zA-Z]{2,})/g, (m) =>
        m.replace(/[ \t]+/g, "")
      )
      .replace(/https?[ \t]*:[ \t]*\/\/[ \t]*/gi, "https://")
      .replace(/(?:www[ \t]*\.[ \t]*)?(github|linkedin|gitlab|leetcode|kaggle|behance|dribbble|medium|huggingface)[ \t]*\.[ \t]*(com|io|org|in|net|co)(?:[ \t]*\/[ \t]*[^\s|•,;]+)*/gi, (m) =>
        m.replace(/[ \t]+/g, "")
      )
      .replace(/((?:github|linkedin)\.com\/[^\s]+?)[ \t]*-[ \t]+([^\s]+)/gi, "$1-$2");

    cleaned = cleaned
      .replace(/\bI\s*'\s*ve\b/gi, "I've")
      .replace(/\bNext\s*\.\s*js\b/gi, "Next.js")
      .replace(/\bNode\s*\.\s*js\b/gi, "Node.js")
      .replace(/\bVue\s*\.\s*js\b/gi, "Vue.js")
      .replace(/\bReact\s*\.\s*js\b/gi, "React.js")
      .replace(/\bExpress\s*\.\s*js\b/gi, "Express.js")
      .replace(/\bChart\s*\.\s*js\b/gi, "Chart.js")
      .replace(/\bThree\s*\.\s*js\b/gi, "Three.js")
      .replace(/\bSocket\s*\.\s*io\b/gi, "Socket.io")
      .replace(/\bB\s*\.\s*E\s*\.\b/gi, "B.E.")
      .replace(/\bM\s*\.\s*E\s*\.\b/gi, "M.E.")
      .replace(/\bB\s*\.\s*Tech\b/gi, "B.Tech")
      .replace(/\bM\s*\.\s*Tech\b/gi, "M.Tech")
      .replace(/\bPh\s*\.\s*D\b/gi, "Ph.D")
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
      .replace(/\bCI\s*\/\s*CD\b/gi, "CI/CD")
      .replace(/\bUI\s*\/\s*UX\b/gi, "UI/UX")
      .replace(/[ \t]+([.,;:])/g, "$1")
      .replace(/[ \t]+-[ \t]+/g, " - ");

    // Spaced hyphens before conjunctions: "AWS - and" -> "AWS and"
    cleaned = cleaned.replace(/\b([A-Za-z0-9]+)[ \t]*-[ \t]+(and|or|with|to)\b/gi, "$1 $2");

    // Fix spaced hyphens in compound words
    cleaned = cleaned
      .replace(/\bReal\s*-\s*Time\b/g, "Real-Time")
      .replace(/\breal\s*-\s*time\b/gi, "real-time")
      .replace(/\bon\s*-\s*device\b/gi, "on-device")
      .replace(/\bvoice\s*-\s*first\b/gi, "voice-first")
      .replace(/\bopen\s*-\s*source\b/gi, "open-source")
      .replace(/\bend\s*-\s*to\s*-\s*end\b/gi, "end-to-end")
      .replace(/\bedge\s*-\s*native\b/gi, "edge-native")
      .replace(/\b3\s*r\s*d\s*Y\s*e\s*a\s*r\b/gi, "3rd Year")
      .replace(/\b([A-Za-z0-9]+)[ \t]+-[ \t]+([A-Za-z0-9]+)\b/g, "$1-$2");

    // Clean multi-page headers and footers
    cleaned = cleaned.replace(/(?:^|\n)[ \t]*(?:Page\s+\d+\s*(?:of|\/)\s*\d+|\b\d+\s*(?:of|\/)\s*\d+\b|Page\s+\d+)[ \t]*(?=\n|$)/gi, "\n");

    // Generalized OCR/PDF mid-word split healing (safe suffixes that are never standalone English words)
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
      .replace(/\bidenti\s+fication\b/gi, "identification")
      .replace(/\b([A-Za-z]{2,})[ \t]+(tion|sion|tions|sions|ment|ments|ness|ence|ance|ities|ity|ization|isation|ically|ative|ature|cture|tecture|gorithms|rithms|able|ible|ship|ships)\b/g, "$1$2");

    // Stitch wrapped multi-line section headings (e.g. "TECHNICAL\nSKILLS", "WORK\nEXPERIENCE")
    cleaned = cleaned
      .replace(/\b(TECHNICAL|CORE)\s*\r?\n[ \t]*(SKILLS|COMPETENCIES)\b/gi, "$1 $2")
      .replace(/\b(WORK|PROFESSIONAL|RELEVANT|INTERNSHIP)\s*\r?\n[ \t]*(EXPERIENCE|SUMMARY|HISTORY)\b/gi, "$1 $2")
      .replace(/\b(PROJECTS\s*&\s*PRODUCTION)\s*\r?\n[ \t]*(BUILDS)\b/gi, "$1 $2")
      .replace(/\b(CERTIFICATIONS\s*(?:&|AND))\s*\r?\n[ \t]*(ACHIEVEMENTS|AWARDS|LICENSES)\b/gi, "$1 $2")
      .replace(/\b(POSITIONS\s+OF)\s*\r?\n[ \t]*(RESPONSIBILITY)\b/gi, "$1 $2");

    // Clean whitespace around symbols & and | and category slashes like Awards/Activities
    cleaned = cleaned
      .replace(/\s*&\s*/g, " & ")
      .replace(/\s*\|\s*/g, " | ")
      .replace(/\b(Awards|Certifications|Achievements|Skills)\s*\/\s*(Activities|Achievements|Awards|Certifications|Licenses|Honors)\b/gi, "$1 / $2");

    // Auto-balance unclosed brackets in awards/certifications/hackathons
    cleaned = cleaned.replace(/\[([^\]\n|;]+)(?=\s*(?:\||;|\n|$))/g, (_match, p1) => `[ ${p1.trim()} ]`);

    // Standardize all Unicode bullets to newline bullet
    cleaned = cleaned.replace(/\s*([•·▪●\uF0B7\uF0A7\u2022\u2023\u2043\u2219\u25CB\u25CF\u25AA\u25AB\u25B6\u25BA\u25C6➢➤‣])\s*/g, "\n• ");

    // Break inline skill category headings onto new lines
    const knownSkillCategories =
      "Frontend\\s*(?:\\/|&)\\s*Mobile|Backend\\s*(?:\\/|&)\\s*APIs|Databases\\s*(?:\\/|&)\\s*(?:Cloud|Tools|Technologies|Storage)|Tools\\s*(?:\\/|&)\\s*(?:Others|Other|Technologies|Frameworks|Platforms)|Languages\\s*(?:\\/|&)\\s*(?:Frameworks|Tools)|Programming\\s*Languages|Cloud\\s*(?:\\/|&)\\s*(?:Deployment|Infrastructure|Platforms)|DevOps\\s*(?:\\/|&)\\s*CI\\/CD|AI\\s*(?:\\/|&)\\s*ML|AI\\s*(?:\\/|&)\\s*GenAI|Web\\s*(?:\\/|&)\\s*Backend|Frameworks\\s*(?:\\/|&)\\s*Libraries|Security\\s*Tools|Core\\s*Competencies";

    cleaned = cleaned.replace(
      new RegExp(`(?<=[A-Za-z0-9+/.)\\]])[ \\t]+(${knownSkillCategories})[ \\t]*:?[ \\t]*`, "gi"),
      "\n$1:\n"
    );

    const actionVerbs = this.ACTION_VERBS_LIST.join("|");

    // Handle spoken languages inline (e.g. "Languages: English, Hindi, Malayalam, Marathi")
    cleaned = cleaned.replace(/(?:^|\n|\s{2,})\s*Languages\s*:\s*([A-Za-z\s,.()]+?)(?=\s*(?:===|Certifications|Awards|Projects|\n|$))/gi, (match, langs) => {
      const isSpoken = /english|hindi|spanish|french|german|mandarin|malayalam|marathi|telugu|tamil|kannada|bengali|gujarati|punjabi|japanese|chinese|russian|arabic|korean|portuguese|italian/i.test(langs);
      if (isSpoken) {
        return `\n\n===SECTION: SPOKEN LANGUAGES===\n${langs.trim()}\n`;
      }
      return match;
    });

    const majorSections = [
      "PROFESSIONAL EXPERIENCE",
      "WORK EXPERIENCE",
      "WORK HISTORY",
      "RELEVANT EXPERIENCE",
      "INDUSTRY EXPERIENCE",
      "INTERNSHIP EXPERIENCE",
      "INTERNSHIPS",
      "RESEARCH EXPERIENCE",
      "EMPLOYMENT HISTORY",
      "EXPERIENCE",
      "CAREER HISTORY",
      "TECHNICAL PROJECTS",
      "PERSONAL PROJECTS",
      "KEY PROJECTS",
      "SELECTED PROJECTS",
      "ACADEMIC PROJECTS",
      "SOFTWARE PROJECTS",
      "SIDE PROJECTS",
      "PROJECTS & PRODUCTION BUILDS",
      "PROJECTS & BUILDS",
      "PROJECTS",
      "PROFESSIONAL SUMMARY",
      "CAREER SUMMARY",
      "EXECUTIVE SUMMARY",
      "CAREER OBJECTIVE",
      "OBJECTIVE",
      "OVERVIEW",
      "ABOUT ME",
      "ABOUT",
      "SUMMARY",
      "PERSONAL PROFILE",
      "PROFILE",
      "TECHNICAL SKILLS",
      "TECHNICAL & CORE SKILLS",
      "CORE SKILLS",
      "CORE COMPETENCIES",
      "AREAS OF EXPERTISE",
      "SKILLS & EXPERTISE",
      "SKILLS SUMMARY",
      "TECHNOLOGY STACK",
      "TECH STACK",
      "SKILLS",
      "EDUCATION & TRAINING",
      "EDUCATION",
      "ACADEMIC HISTORY",
      "ACADEMIC BACKGROUND",
      "ACADEMIC QUALIFICATIONS",
      "QUALIFICATIONS",
      "CERTIFICATIONS & ACHIEVEMENTS",
      "CERTIFICATIONS AND ACHIEVEMENTS",
      "CERTIFICATIONS / ACHIEVEMENTS",
      "CERTIFICATIONS & AWARDS",
      "CERTIFICATIONS AND AWARDS",
      "ACHIEVEMENTS & CERTIFICATIONS",
      "CERTIFICATIONS & LICENSES",
      "LICENSES & CERTIFICATIONS",
      "CERTIFICATIONS & COURSES",
      "COURSES & CERTIFICATIONS",
      "PROFESSIONAL CERTIFICATIONS",
      "CERTIFICATIONS",
      "CERTIFICATES & ACHIEVEMENTS",
      "CERTIFICATES",
      "AWARDS / ACTIVITIES",
      "AWARDS & ACTIVITIES",
      "AWARDS & HONORS",
      "HONORS & AWARDS",
      "HONORS",
      "ACHIEVEMENTS",
      "KEY ACHIEVEMENTS",
      "ACADEMIC ACHIEVEMENTS",
      "ACCOMPLISHMENTS",
      "HACKATHONS",
      "AWARDS",
      "CO-CURRICULAR ACTIVITIES",
      "EXTRA-CURRICULAR ACTIVITIES",
      "EXTRACURRICULAR ACTIVITIES",
      "LEADERSHIP EXPERIENCE",
      "LEADERSHIP & ACTIVITIES",
      "LEADERSHIP",
      "POSITIONS OF RESPONSIBILITY",
      "ADDITIONAL INFORMATION",
      "RESEARCH & PUBLICATIONS",
      "PUBLICATIONS",
      "VOLUNTEER EXPERIENCE",
      "VOLUNTEER WORK",
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

      // If inline and the matched word is lowercase (e.g. "hands-on experience in"), it is prose, not a section header
      if (!isStartOfLine && p1 === p1.toLowerCase()) {
        return match;
      }

      // If inline and followed by common prepositions / verbs, it is prose
      const textAfter = fullStr.substring(offset + match.length, offset + match.length + 18);
      if (!isStartOfLine && /^\s+(?:in|with|of|for|to|and|across|building|using|on|at)\b/i.test(textAfter)) {
        return match;
      }

      return `\n\n===SECTION: ${p1.toUpperCase().trim()}===\n`;
    });

    // Decouple embedded roles with explicit dates (e.g. "Technical Associate , GDSC CRCE June 2025 - May 2026")
    const roleWithDatePattern = /(?<=\s|^)\b((?:Technical[ \t]+|Software[ \t]+|Frontend[ \t]+|Backend[ \t]+|Full[ \t]*Stack[ \t]+|Senior[ \t]+|Junior[ \t]+|PR[ \t]*&[ \t]*Media[ \t]+)?(?:Associate|Lead|Intern|Developer|Engineer|Manager|Architect|Consultant|Analyst|Director|Coordinator|President|Officer))\s*,\s*([A-Za-z0-9\t &.-]+?)[ \t]+((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[ \t]+)?(?:\b(?:19|20)\d{2}\b|'\d{2})[ \t]*(?:-|–|—|to)[ \t]*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[ \t]*)?(?:\b(?:19|20)\d{2}\b|'\d{2}|present|current|ongoing))\s*/gi;
    cleaned = cleaned.replace(roleWithDatePattern, (_match, role, org, dates) => {
      return `\n\n===SECTION: PROFESSIONAL EXPERIENCE===\n===ROLE: ${role.trim()} at ${org.trim()}===\n${dates.trim()}\n`;
    });

    // Decouple embedded roles with —, –, -, at, @, or comma
    const embeddedRolePattern = new RegExp(
      `(?:^|\\.|\\n|[ \t]{2,})[ \t]*\\b((?:Senior[ \t]+|Junior[ \t]+|Technical[ \t]+|Lead[ \t]+|Head[ \t]+of[ \t]+|Public[ \t]+Relations[A-Za-z0-9 ,/-]*?[ \t]+)?[A-Z][A-Za-z0-9 /&,-]{1,40}?\\b(?:Head|Lead|Intern|Manager|Developer|Engineer|Architect|Director|President|Coordinator|Officer|Analyst|Consultant|Specialist|Associate))[ \t]*(?:—|–|-|at|@|,)[ \t]*([A-Za-z0-9 &().,-]+?)(?=[ \t]*(?:${actionVerbs}|\\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current|Ongoing|\\n|•|$))`,
      "gi"
    );

    // Only apply to experience / volunteer / leadership sections
    const sectionChunks = cleaned.split(/(?====SECTION:)/);
    cleaned = sectionChunks
      .map((chunk) => {
        if (/===SECTION:\s*(?:EXPERIENCE|WORK\s*EXPERIENCE|EMPLOYMENT|PROFESSIONAL\s*EXPERIENCE|INTERNSHIP|WORK\s*HISTORY|VOLUNTEER|LEADERSHIP|POSITIONS\s+OF\s+RESPONSIBILITY)/i.test(chunk)) {
          return chunk.replace(embeddedRolePattern, (match, role, org) => {
            if (role.includes("===") || org.includes("===")) return match;
            return `\n\n===ROLE: ${role.trim()} at ${org.trim()}===\n`;
          });
        }
        return chunk;
      })
      .join("");

    // Split before action verbs if preceded by period, date, country, or metric words
    cleaned = cleaned.replace(
      new RegExp(`(?<=\\.|\\b\\d{4}\\b|\\bpresent\\b|teams|portal|club|activities|country|countries|workflows)\\s+(?=(?:${actionVerbs})\\b)`, "gi"),
      "\n• "
    );

    return cleaned;
  }

  /**
   * Parses work experience / volunteer / leadership blocks
   */
  private static parseExperienceBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const datePattern = this.DATE_RANGE_REGEX;
    const actionVerbRegex = new RegExp(`^(?:${this.ACTION_VERBS_LIST.join("|")})\\b`, "i");

    let currentRole: {
      title: string;
      organization?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      bullets: string[];
      rawLines: string[];
    } | null = null;

    const flushRole = () => {
      if (currentRole && (currentRole.bullets.length > 0 || currentRole.startDate || currentRole.organization)) {
        results.push(this.formatExperienceRole(currentRole));
      }
    };

    const splitRoleOrgLoc = (headerText: string): { title: string; org?: string; loc?: string } => {
      // Handle multi-pipe headers like "Role | Company | Location" or "Company | Role | Remote"
      const pipeSegments = headerText.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
      if (pipeSegments.length >= 3) {
        let loc: string | undefined;
        const remaining: string[] = [];
        for (const seg of pipeSegments) {
          if (!loc && this.LOCATION_LINE_REGEX.test(seg)) {
            loc = seg;
          } else {
            remaining.push(seg);
          }
        }
        if (remaining.length >= 2) {
          const a = remaining[0];
          const b = remaining.slice(1).join(" · ");
          if (!this.ROLE_KEYWORDS_REGEX.test(a) && this.ROLE_KEYWORDS_REGEX.test(b)) {
            return { title: b, org: a, loc };
          }
          return { title: a, org: b, loc };
        }
      }

      const separatorMatch = headerText.match(/^(.+?)\s+(?:at|@|\||,|—|–)\s+(.+)$/i);
      if (separatorMatch) {
        let partA = separatorMatch[1].trim();
        let partB = separatorMatch[2].trim();
        let loc: string | undefined;

        // Check if partB contains trailing location separated by comma or pipe (e.g. "Acme Corp, San Francisco, CA" or "Acme Corp | Remote")
        const locSuffix = partB.match(/^(.+?)\s*(?:\||,)\s*(Remote|Hybrid|On-?site|[A-Z][a-zA-Z.\s]{1,25},\s*(?:[A-Z]{2}|India|USA|UK|Canada|Germany|Singapore|Australia))$/i);
        if (locSuffix && !this.ORG_KEYWORDS_REGEX.test(locSuffix[2])) {
          partB = locSuffix[1].trim();
          loc = locSuffix[2].trim();
        }

        // If partA lacks role keywords and partB has role keywords (e.g. "Google — Senior Software Engineer"), swap!
        if (!this.ROLE_KEYWORDS_REGEX.test(partA) && this.ROLE_KEYWORDS_REGEX.test(partB)) {
          return { title: partB, org: partA, loc };
        }
        return { title: partA, org: partB, loc };
      }

      return { title: headerText };
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[•\-\*]\s+/.test(line);
      const isActionSentence = Boolean(
        currentRole &&
        currentRole.organization &&
        (
          actionVerbRegex.test(line) ||
          (line.length > 55 && !/(?:—|–|-|\bat\b|@|\|)/.test(line))
        )
      );
      const dateMatch = line.match(datePattern);

      const roleMarkerMatch = line.match(/^===ROLE:\s*(.+?)\s+at\s+(.+)===$/i);
      if (roleMarkerMatch) {
        let mergedTitle = roleMarkerMatch[1].trim();
        if (currentRole && !currentRole.organization && currentRole.bullets.length === 0 && currentRole.title && currentRole.title !== "Professional Role") {
          mergedTitle = `${currentRole.title} / ${mergedTitle}`;
        } else {
          flushRole();
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

        // Date-only or Org + Date line for currentRole without startDate
        if (currentRole && !currentRole.startDate && dateMatch) {
          const parsedDates = this.parseDateRangeMatch(dateMatch[0]);
          const orgPart = line.replace(datePattern, "").replace(/[,|·•—–-]\s*$/, "").trim();
          if (orgPart.length > 0 && orgPart.length < 60) {
            if (this.LOCATION_LINE_REGEX.test(orgPart)) {
              currentRole.location = currentRole.location || orgPart;
            } else if (!currentRole.organization) {
              currentRole.organization = orgPart;
            }
          }
          currentRole.startDate = parsedDates.startDate || undefined;
          currentRole.endDate = parsedDates.endDate || undefined;
          currentRole.isCurrent = parsedDates.isCurrent;
          currentRole.rawLines.push(line);
          continue;
        }

        // Standalone location line right under role/date before bullets (e.g. "Remote" or "San Francisco, CA")
        if (currentRole && currentRole.bullets.length === 0 && !currentRole.location && !dateMatch && this.LOCATION_LINE_REGEX.test(line)) {
          currentRole.location = line.trim();
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
            (!dateMatch && !/(?:—|–|-|\bat\b|@|\|)/.test(line) && !this.ROLE_KEYWORDS_REGEX.test(line))
          )
        );

        if (isBulletContinuation && currentRole) {
          const lastIdx = currentRole.bullets.length - 1;
          currentRole.bullets[lastIdx] = `${currentRole.bullets[lastIdx]} ${line}`.replace(/\s{2,}/g, " ").trim();
          currentRole.rawLines.push(line);
          continue;
        }

        flushRole();

        let headerText = line;
        let parsedDates: { startDate: string | null; endDate: string | null; isCurrent: boolean } | null = null;

        if (dateMatch) {
          parsedDates = this.parseDateRangeMatch(dateMatch[0]);
          headerText = line.replace(datePattern, "").replace(/[,|·•—–-]\s*$/, "").trim();
        }

        let { title, org, loc } = splitRoleOrgLoc(headerText);

        if (!org && i + 1 < lines.length && !lines[i + 1].match(/^[•\-\*]/) && !lines[i + 1].match(datePattern) && lines[i + 1].length < 75 && !lines[i + 1].startsWith("===") && !actionVerbRegex.test(lines[i + 1])) {
          const nextLine = lines[i + 1];
          const nextSepMatch = nextLine.match(/^(.+?)\s*(?:—|–|-|at|@)\s*(.+)$/i);
          if (nextSepMatch) {
            if (!this.ROLE_KEYWORDS_REGEX.test(title) && this.ROLE_KEYWORDS_REGEX.test(nextSepMatch[1])) {
              org = `${title} · ${nextSepMatch[2].trim()}`;
              title = nextSepMatch[1].trim();
            } else {
              title = `${title} / ${nextSepMatch[1].trim()}`;
              org = nextSepMatch[2].trim();
            }
          } else if (this.LOCATION_LINE_REGEX.test(nextLine)) {
            loc = nextLine;
          } else if (!this.ROLE_KEYWORDS_REGEX.test(title) && this.ROLE_KEYWORDS_REGEX.test(nextLine)) {
            // Line 1 was Company, Line 2 is Job Title
            org = title;
            title = nextLine;
          } else {
            org = nextLine;
          }
          i++;
        }

        currentRole = {
          title: title || "Professional Role",
          organization: org,
          location: loc,
          startDate: parsedDates?.startDate || undefined,
          endDate: parsedDates?.endDate || undefined,
          isCurrent: parsedDates?.isCurrent || false,
          bullets: [],
          rawLines: [line],
        };
      } else if (currentRole) {
        const bulletText = line.replace(/^[•\-\*]\s*/, "");
        const actionAlt = this.ACTION_VERBS_LIST.slice(0, 35).join("|");
        // Check if an embedded role heading was attached to this bullet line
        const embeddedRoleMatch = bulletText.match(
          new RegExp(`(?:^|[.\\n])\\s*\\b((?:Senior\\s+|Junior\\s+|Lead\\s+|Head\\s+of\\s+|Public\\s+Relations[A-Za-z0-9\\s&,/.-]*?|Cybersecurity\\s+Intern\\s*[/|\\s]+\\s*)?[A-Z][A-Za-z0-9\\s&/.-]{1,55}?\\b(?:Head|Lead|Intern|Manager|Developer|Engineer|Architect|Director|President|Coordinator|Officer|Analyst|Consultant|Specialist|Associate))\\s*(?:—|–|-|at|@)\\s*([A-Za-z0-9\\s&().,-]+?)(?:\\s+(?:${actionAlt})\\b|$)`, "i")
        );
        if (embeddedRoleMatch && embeddedRoleMatch.index !== undefined) {
          const priorText = bulletText.substring(0, embeddedRoleMatch.index).trim();
          if (priorText) {
            currentRole.bullets.push(priorText);
          }
          flushRole();
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

    flushRole();
    return results;
  }

  private static formatExperienceRole(role: {
    title: string;
    organization?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    bullets: string[];
    rawLines: string[];
  }): StructuredResumeSection {
    let finalBullets = role.bullets;
    const datePattern = this.DATE_RANGE_REGEX;

    // If role has no date yet, check if any of the bullets contains a trailing date range like "July 2026 - Present"
    if (!role.startDate) {
      for (let b = finalBullets.length - 1; b >= 0; b--) {
        const bulletDateMatch = finalBullets[b].match(datePattern);
        if (bulletDateMatch) {
          const parsedDates = this.parseDateRangeMatch(bulletDateMatch[0]);
          role.startDate = parsedDates.startDate || undefined;
          role.endDate = parsedDates.endDate || undefined;
          role.isCurrent = parsedDates.isCurrent;
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

    // Clean trailing contact information leakage from bullets
    finalBullets = finalBullets
      .map((b) =>
        b
          .replace(/\b[A-Z\s]{4,30}\s+(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b.*$/i, "")
          .replace(/(?:\|\s*)?(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:linkedin|github)\.com\S*|https?:\/\/\S*).*$/i, "")
          .replace(datePattern, "")
          .replace(/[,—–-]\s*$/, "")
          .trim()
      )
      .filter((b) => {
        if (!b || b.length < 3) return false;
        if (/@|github\.com|linkedin\.com|\b\d{10}\b/.test(b) && b.length < 50) return false;
        return true;
      });

    return {
      entryType: "experience",
      title: role.title,
      organization: role.organization || null,
      location: role.location || null,
      startDate: role.startDate || null,
      endDate: role.endDate || null,
      isCurrent: role.isCurrent || false,
      bullets: finalBullets.length > 0 ? finalBullets : [role.title],
      confidence: 0.9,
      rawSnippet: role.rawLines.join("\n").substring(0, 300),
    };
  }

  /**
   * Parses education blocks, attaching GPA/CGPA/Coursework/Honors to the parent degree entry
   * rather than spawning bogus separate education items.
   */
  private static parseEducationBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const rangePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2}|present|current|ongoing|expected)/i;
    const yearPattern = /\b(?:19|20)\d{2}\b/;
    const degreePattern =
      /\b(bachelor|master|phd|ph\.?d|doctorate|associate|diploma|engineering|higher\s+secondary|secondary|icse|cbse|hsc|ssc|isc|\d{1,2}th\s*(?:grade|std)?|class\s*(?:x|xii|10|12)|b\.?tech\b|m\.?tech\b|b\.?e(?:\.|\b)|m\.?e(?:\.|\b)|b\.?sc?\b|m\.?sc?\b|b\.?c\.?a\b|m\.?c\.?a\b|b\.?b\.?a\b|m\.?b\.?a\b|b\.?a(?:\.|\b)|b\.?des\b)/i;
    const institutionKeywords = /\b(?:College|University|School|Institute|Academy|Polytechnic|IIT|NIT|IIIT|BITS)\b/i;
    const eduDetailLinePattern =
      /^(?:[•\-\*]\s+|(?:cgpa|gpa|sgpa|percentage|marks|score|grade|grades|cpi|relevant\s+coursework|coursework|courses|minor|specialization|honors|honours|thesis|dissertation|dean'?s\s+list|activities|clubs)\s*:|\d+(?:\.\d+)?\s*(?:\/\s*(?:4|10|100)|%)\b)/i;

    const institutionSplitRegex =
      /(?<=(?:Present|Current|\b\d{4}\b|\)\s*|Science|Commerce|Arts|Engineering|\bGrade\b))\s+(?=[A-Z][A-Za-z0-9\s.()]{2,50}\b(?:College|University|School|Institute|Academy)\b)/gi;

    // Expand any lines that contain multiple institutions concatenated together
    const expandedLines: string[] = [];
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (institutionSplitRegex.test(trimmed)) {
        institutionSplitRegex.lastIndex = 0;
        expandedLines.push(...trimmed.split(institutionSplitRegex).map((s) => s.trim()).filter(Boolean));
      } else {
        expandedLines.push(trimmed);
      }
    }

    const fullText = expandedLines.join(" ");

    // Fast path for single-line "Institution — Degree (Dates)" format
    if (expandedLines.length > 1) {
      let allDashStyle = true;
      const dashResults: StructuredResumeSection[] = [];
      for (const rawLine of expandedLines) {
        const line = rawLine.replace(/^[•\-\*]\s*/, "").trim();
        if (line.length < 5) continue;

        if (eduDetailLinePattern.test(rawLine) && dashResults.length > 0) {
          dashResults[dashResults.length - 1].bullets.push(line);
          continue;
        }

        const dashMatch = line.match(/^(.+?)\s*(?:—|–|-)\s*(.+)$/);
        if (dashMatch && !rangePattern.test(line.replace(dashMatch[1], "") === dashMatch[2] ? "" : "")) {
          let partA = dashMatch[1].trim();
          let partB = dashMatch[2].trim();

          const rangeMatch = partB.match(rangePattern) || partA.match(rangePattern);
          let startDate: string | null = null;
          let endDate: string | null = null;
          let isCurrent = false;

          if (rangeMatch) {
            startDate = rangeMatch[2];
            const endRaw = rangeMatch[4];
            isCurrent = Boolean(endRaw && /present|current|ongoing|expected/i.test(endRaw));
            endDate = isCurrent ? null : endRaw;
          } else {
            const yearMatches = partB.match(/\b(?:19|20)\d{2}\b/g) || partA.match(/\b(?:19|20)\d{2}\b/g) || [];
            startDate = (yearMatches.length > 1 ? yearMatches[0] : null) ?? null;
            endDate = yearMatches.at(-1) ?? null;
          }

          partB = partB.replace(rangePattern, "").replace(yearPattern, "").replace(/[|·]\s*$/, "").trim();
          partA = partA.replace(rangePattern, "").replace(yearPattern, "").replace(/[|·]\s*$/, "").trim();

          let institution = partA;
          let degree = partB;

          if (degreePattern.test(partA) && institutionKeywords.test(partB)) {
            institution = partB;
            degree = partA;
          }

          if (institution && degree && (institutionKeywords.test(institution) || degreePattern.test(degree))) {
            dashResults.push({
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
        allDashStyle = false;
      }

      if (dashResults.length > 0 && (allDashStyle || dashResults.length >= 2)) {
        return dashResults;
      }
    }

    const consumed = new Set<number>();

    for (let i = 0; i < expandedLines.length; i++) {
      if (consumed.has(i)) continue;
      const line = expandedLines[i];
      const cleanLine = line.replace(/^[•\-\*]\s*/, "").trim();
      const isDateOnly = rangePattern.test(cleanLine) && cleanLine.replace(rangePattern, "").trim().length === 0;
      if (cleanLine.length < 3 || isDateOnly) continue;

      // Attach academic metadata / highlights (GPA, CGPA, Coursework, Honors, bullets) to previous entry
      if (results.length > 0 && (eduDetailLinePattern.test(line) || (!degreePattern.test(cleanLine) && !institutionKeywords.test(cleanLine)))) {
        const lastEdu = results[results.length - 1];
        if (this.LOCATION_LINE_REGEX.test(cleanLine) && !lastEdu.location) {
          lastEdu.location = cleanLine;
        } else {
          lastEdu.bullets.push(cleanLine);
        }
        continue;
      }

      let title = cleanLine;
      let institution: string | undefined;
      let location: string | undefined;
      let dateLine: string | undefined;
      const bullets: string[] = [];
      const next = expandedLines[i + 1];

      if (degreePattern.test(cleanLine)) {
        const nextWithoutDate = next
          ? next.replace(/^[•\-\*]\s*/, "").replace(rangePattern, "").replace(yearPattern, "").replace(/[|·•—–,-]\s*$/, "").trim()
          : "";
        if (next && !degreePattern.test(next) && !eduDetailLinePattern.test(next) && nextWithoutDate.length > 2 && (institutionKeywords.test(next) || nextWithoutDate.length < 80)) {
          institution = nextWithoutDate;
          if (rangePattern.test(next) || yearPattern.test(next)) {
            dateLine = next;
          }
          consumed.add(i + 1);
        } else if (!institution && (institutionKeywords.test(cleanLine) || cleanLine.includes("Engineering"))) {
          const parts = cleanLine.split(/(?=B\s*\.?\s*Tech\b|M\s*\.?\s*Tech\b|B\s*\.?\s*E(?:\.|\b)|M\s*\.?\s*E(?:\.|\b)|Bachelor|Master|Associate|Diploma|B\.?S\.?\b|M\.?S\.?\b)/i);
          if (parts.length > 1) {
            institution = parts[0].replace(/[,|·•-]\s*$/, "").trim();
            title = parts[1].replace(/\|.*$/, "").trim();
          }
        }
        if (!dateLine) {
          const dateIndex = i + (institution ? 2 : 1);
          const possibleDate = expandedLines[dateIndex];
          if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
            possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 12) {
            dateLine = possibleDate;
            consumed.add(dateIndex);
          }
        }
      } else if (next && degreePattern.test(next)) {
        institution = cleanLine;
        title = next.replace(/^[•\-\*]\s*/, "").trim();
        consumed.add(i + 1);
        const possibleDate = expandedLines[i + 2];
        if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
          possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 12) {
          dateLine = possibleDate;
          consumed.add(i + 2);
        }
      } else {
        const possibleDate = next;
        if (possibleDate && (rangePattern.test(possibleDate) || yearPattern.test(possibleDate)) &&
          possibleDate.replace(rangePattern, "").replace(yearPattern, "").trim().length < 12) {
          dateLine = possibleDate;
          consumed.add(i + 1);
        }
      }

      // Clean GPA / percentage piped onto degree or date line (e.g. "B.Tech CSE | CGPA: 9.2 | 2024 - Present")
      const gpaInTitle = title.match(/\b((?:CGPA|GPA|SGPA|Percentage|Score)\s*[:\-]?\s*[\d.]+(?:\s*\/\s*[\d.]+)?%?)/i);
      if (gpaInTitle) {
        bullets.push(gpaInTitle[1].trim());
        title = title.replace(gpaInTitle[0], "").replace(/\s*\|\s*$/, "").trim();
      }

      const dateText = dateLine || cleanLine;
      const rangeMatch = dateText.match(rangePattern);
      const yearMatches = dateText.match(/\b(?:19|20)\d{2}\b/g) || [];
      const startDate = rangeMatch?.[2] || (yearMatches.length > 1 ? yearMatches[0] : null);
      const endRaw = rangeMatch?.[4] || yearMatches.at(-1) || null;
      const isCurrent = Boolean((endRaw && /present|current|ongoing|expected/i.test(endRaw)) || /expected/i.test(dateText));
      const endDate = endRaw && /present|current|ongoing/i.test(endRaw) ? null : endRaw;

      // Strip date from title if glued
      title = title.replace(rangePattern, "").replace(/\s*[|·•—–-]\s*$/, "").trim();

      // Extract trailing location from institution if present (e.g. "College Name, Mumbai")
      if (institution) {
        const instLoc = institution.match(/^(.+?),\s*([A-Z][a-zA-Z.\s]{2,25}(?:,\s*(?:[A-Z]{2}|India|USA|UK|Canada))?)$/);
        if (instLoc && !institutionKeywords.test(instLoc[2])) {
          institution = instLoc[1].trim();
          location = instLoc[2].trim();
        }
      }

      results.push({
        entryType: "education",
        title: title || "Academic Degree",
        organization: institution || null,
        location: location || null,
        startDate,
        endDate,
        isCurrent,
        bullets,
        confidence: 0.92,
        rawSnippet: [line, institution, dateLine].filter(Boolean).join("\n"),
      });
    }

    if (results.length > 0) {
      return results.slice(0, 6);
    }

    // Fallback: single-line continuous text
    const degreeMatch = fullText.match(/\b(B\s*\.?\s*Tech\b|M\s*\.?\s*Tech\b|B\s*\.?\s*E(?:\.|\b)|Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.)(?:\s+in\s+([A-Za-z\s&]+))?/i);
    const dateMatch = fullText.match(/(?:expected\s+)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\b20\d{2}\b)/i);

    if (degreeMatch || fullText.includes("Engineering") || fullText.includes("College") || fullText.includes("University")) {
      let institution = expandedLines[0] || "University";
      let degree = degreeMatch ? degreeMatch[0] : "Degree";

      if (institutionKeywords.test(fullText)) {
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
        isCurrent: /expected|present/i.test(fullText),
        bullets: [],
        confidence: 0.95,
        rawSnippet: fullText.substring(0, 200),
      }];
    }

    return [];
  }

  /**
   * Parses project blocks across varied heading formats:
   * - Title — Subtitle
   * - Title | Tech1 | Tech2 | Date
   * - Title (Tech1, Tech2)
   * - Title + Tech Stack: ... / GitHub link
   * - Multi-sentence or bullet-list descriptions with wrapped line continuations
   */
  private static parseProjectBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const actionStartRegex = new RegExp(`^(?:${this.ACTION_VERBS_LIST.join("|")})\\b`, "i");
    const fullText = lines.join("\n");

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
        let startDate: string | null = null;
        let endDate: string | null = null;
        let embeddedActionBullet: string | null = null;

        // Extract date range if present on header line
        const dateMatch = firstLine.match(this.DATE_RANGE_REGEX);
        if (dateMatch) {
          const parsed = this.parseDateRangeMatch(dateMatch[0]);
          startDate = parsed.startDate;
          endDate = parsed.endDate;
          firstLine = firstLine.replace(this.DATE_RANGE_REGEX, "").replace(/[|·—–-]\s*$/, "").trim();
          title = firstLine;
        }

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
            // Check if the word right before the first pipe is a glued tech token (like "Next.js | Groq")
            if (lastSpaceIdx > 0 && /(?:—|\b(?:Next\.js|Flask|Python|React|Flutter|Go|Rust|Java|Node\.js|TypeScript|Django|FastAPI|Docker|AWS)\b)/i.test(beforePipe.substring(lastSpaceIdx))) {
              title = beforePipe.substring(0, lastSpaceIdx).trim();
              techLine = beforePipe.substring(lastSpaceIdx).trim() + " " + afterPipe.trim();
            } else {
              title = beforePipe.trim();
              techLine = afterPipe.replace(/^\|\s*/, "").trim();
            }
          }
        }

        const bullets: string[] = [];
        if (embeddedActionBullet) {
          bullets.push(embeddedActionBullet);
        }

        for (let i = 1; i < segLines.length; i++) {
          const l = segLines[i];
          if (/^(?:•|\-|\*)\s*/.test(l)) {
            bullets.push(l.replace(/^[•\-\*]\s*/, ""));
          } else if (/^(?:Tech\s*Stack|Technologies|Built\s*with|Stack|Tools)\s*:/i.test(l)) {
            techLine = techLine ? `${techLine} | ${l}` : l;
          } else if (l.includes("|") && !techLine && l.length < 90) {
            techLine = l;
          } else if (bullets.length > 0 && (/^[a-z]/.test(l) || /^(?:and|or|for|with|of|to|in|by|the|a|an)\b/i.test(l))) {
            bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${l}`.replace(/\s{2,}/g, " ").trim();
          } else if (l.length > 20 && !/^(?:Awards|Languages|Certifications)\s*:/i.test(l)) {
            bullets.push(l);
          }
        }

        if (title.length > 2 && !/^(?:Languages|Certifications|Awards)/i.test(title)) {
          results.push({
            entryType: "project",
            title,
            startDate,
            endDate,
            bullets: bullets.length > 0 ? bullets : [title],
            descriptionContext: techLine || undefined,
            confidence: 0.92,
            rawSnippet: segment.substring(0, 300),
          });
        }
      }
      if (results.length > 0) return results;
    }

    // Standard line-by-line parser: guard against treating action sentences or wrapped lines as project titles!
    let currentProj: {
      title: string;
      techLine?: string;
      startDate?: string | null;
      endDate?: string | null;
      bullets: string[];
      rawSnippet: string;
    } | null = null;

    const flushProj = () => {
      if (currentProj) {
        results.push({
          entryType: "project",
          title: currentProj.title,
          startDate: currentProj.startDate || null,
          endDate: currentProj.endDate || null,
          descriptionContext: currentProj.techLine || undefined,
          bullets: currentProj.bullets.length > 0 ? currentProj.bullets : [currentProj.title],
          confidence: 0.9,
          rawSnippet: currentProj.rawSnippet,
        });
      }
    };

    for (const line of lines) {
      const isBullet = /^[•\-\*]\s+/.test(line);
      const isTechMeta = /^(?:Tech\s*Stack|Technologies|Built\s*with|Stack|Tools|GitHub|Link|Live|Demo)\s*:/i.test(line);
      const isActionSentence = actionStartRegex.test(line);
      const looksLikeSentence = line.endsWith(".") && line.split(/\s+/).length >= 6;
      const isContinuation = Boolean(
        currentProj &&
        currentProj.bullets.length > 0 &&
        (/^[a-z]/.test(line) || /^(?:and|or|for|with|of|to|in|by|the|a|an)\b/i.test(line) || looksLikeSentence)
      );

      if (!isBullet && !isTechMeta && !isActionSentence && !isContinuation && !looksLikeSentence && line.length < 75) {
        flushProj();
        let projTitle = line;
        let techLine: string | undefined;
        let startDate: string | null = null;
        let endDate: string | null = null;

        const dMatch = projTitle.match(this.DATE_RANGE_REGEX);
        if (dMatch) {
          const parsed = this.parseDateRangeMatch(dMatch[0]);
          startDate = parsed.startDate;
          endDate = parsed.endDate;
          projTitle = projTitle.replace(this.DATE_RANGE_REGEX, "").replace(/[|·—–-]\s*$/, "").trim();
        }

        const pipeParts = projTitle.split(/\s*\|\s*/);
        if (pipeParts.length > 1) {
          projTitle = pipeParts[0].trim();
          techLine = pipeParts.slice(1).join(" | ").trim();
        }

        currentProj = {
          title: projTitle,
          techLine,
          startDate,
          endDate,
          bullets: [],
          rawSnippet: line,
        };
      } else if (currentProj) {
        if (isTechMeta) {
          currentProj.techLine = currentProj.techLine ? `${currentProj.techLine} | ${line}` : line;
        } else if (!isBullet && isContinuation && currentProj.bullets.length > 0) {
          const lastIdx = currentProj.bullets.length - 1;
          currentProj.bullets[lastIdx] = `${currentProj.bullets[lastIdx]} ${line}`.replace(/\s{2,}/g, " ").trim();
        } else {
          currentProj.bullets.push(line.replace(/^[•\-\*]\s*/, "").trim());
        }
        currentProj.rawSnippet += "\n" + line;
      }
    }

    flushProj();
    return results;
  }

  /**
   * Parses skills into categorized groups using parenthesis-aware splitting
   * and automatic canonical classification for large uncategorized dumps.
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
      "Security Tools",
      "Cybersecurity Tools",
      "Testing & QA",
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
      .replace(/(?<!\b(?:CI|UI|TCP|I|PL))\s*\/\s*(?!(?:CD|UX|IP|O|SQL)\b)/gi, " / ")
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
        (match, _prefix, categoryName, offset, fullStr) => {
          const before = fullStr.substring(Math.max(0, offset - 10), offset);
          if (before.includes("===CAT:")) return match;
          return `\n===CAT:${categoryName}===\n`;
        }
      );
    }

    const cleanSkillItem = (raw: string): string =>
      raw
        .replace(/\s*\n\s*/g, " ")
        .replace(/[ \t]{2,}/g, " ")
        .trim()
        .replace(/^[:•\-\*]\s*/, "")
        .replace(/^(?:and|&)\s+/i, "")
        .replace(/[.;]+$/, "")
        .trim();

    const pieces = fullText.split(/===CAT:\s*([^=]+)===/);
    const results: StructuredResumeSection[] = [];

    if (pieces.length > 1) {
      for (let i = 1; i < pieces.length; i += 2) {
        const category = pieces[i].trim();
        const rawSkills = pieces[i + 1]?.trim() || "";
        const cleanRaw = rawSkills.replace(/^[:—–-]\s*/, "");

        const rawItems = this.splitRespectingParens(cleanRaw, !cleanRaw.includes(","));

        const seenSkill = new Set<string>();
        const skillList = rawItems
          .map(cleanSkillItem)
          .filter((s) => s.length > 0 && !categoryKeywords.some((ck) => ck.toLowerCase() === s.toLowerCase()))
          .filter((s) => !/^(Soft|Hard|Technical|Core)$/i.test(s))
          .filter((s) => {
            const key = s.toLowerCase();
            if (seenSkill.has(key)) return false;
            seenSkill.add(key);
            return true;
          });

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

    // Fallback: line-by-line parsing
    const flatUncategorized: string[] = [];
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 40) {
        const cat = line.slice(0, colonIdx).replace(/^[•\-\*]\s*/, "").trim();
        const rest = line.slice(colonIdx + 1);
        const skills = this.splitRespectingParens(rest, false)
          .map(cleanSkillItem)
          .filter((s) => s.length > 0 && !/^(Soft|Hard|Technical|Core)$/i.test(s));
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
        const skills = this.splitRespectingParens(line, false).map(cleanSkillItem).filter(Boolean);
        flatUncategorized.push(...skills);
      }
    }

    if (flatUncategorized.length > 0) {
      // If user supplied a flat uncategorized dump (> 6 skills), organize into canonical categories
      if (flatUncategorized.length > 6 && results.length === 0) {
        const classified = classifySkills(flatUncategorized);
        for (const group of classified) {
          results.push({
            entryType: "skill_group",
            title: group.category,
            bullets: group.skills,
            confidence: 0.9,
            rawSnippet: `${group.category}: ${group.skills.join(", ")}`,
          });
        }
      } else {
        results.push({
          entryType: "skill_group",
          title: "Technical Skills",
          bullets: flatUncategorized,
          confidence: 0.85,
          rawSnippet: flatUncategorized.join(", "),
        });
      }
    }

    return results.length > 0
      ? results
      : [{
          entryType: "skill_group",
          title: "Technical Skills",
          bullets: this.splitRespectingParens(lines.join(" "), false).map(cleanSkillItem).filter(Boolean),
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
    res = res.replace(/\[([^\]\n|;]+)(?=\s*(?:\||;|\n|$))/g, (_m, p1) => `[ ${p1.trim()} ]`);
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
   * Extracts issuing authority and issue year from a certification line without
   * falsely splitting "Cert Name, Amazon Web Services (2023)" into two separate entries.
   */
  private static parseSingleCertification(rawItem: string): StructuredResumeSection | null {
    let clean = rawItem.replace(/^[•\-\*]\s*/, "").trim();
    clean = this.balanceBrackets(clean);
    if (clean.length <= 3) return null;

    const dateMatch = clean.match(/\b(19|20)\d{2}\b/);
    const endDate = dateMatch ? dateMatch[0] : null;

    let organization: string | null = null;
    const issuerMatch = clean.match(
      /^(.*?)\s*(?:—|–|\||,|by|from)\s*((?:Amazon\s+Web\s+Services|AWS|Google\s+Cloud|Google|Microsoft|IBM|Meta|Coursera|Udemy|edX|DeepLearning\.AI|Oracle|Cisco|CompTIA|Linux\s+Foundation|CNCF|NPTEL|Udacity|Databricks|Snowflake|HashiCorp|Red\s+Hat|Stanford\s+Online)[^()\n]*?)(?:\s*\(\s*(?:19|20)\d{2}\s*\))?$/i
    );
    if (issuerMatch && issuerMatch[1].trim().length > 4) {
      organization = issuerMatch[2].trim();
    }

    return {
      entryType: "certification",
      title: clean,
      organization,
      endDate,
      bullets: [clean],
      confidence: 0.95,
      rawSnippet: clean,
    };
  }

  /**
   * Parses combined certification and achievement sections, splitting into certifications and awards
   */
  private static parseCertificationAndAchievementBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const mergedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (/^(Winner|Runner\s*Up|Finalist|1st\s*Place|2nd\s*Place|3rd\s*Place|Rank\s*\d+|Top\s*\d+|Champion|Gold\s*Medalist)$/i.test(l) && i + 1 < lines.length) {
        mergedLines.push(`${l} - ${lines[i + 1].trim()}`);
        i++;
        continue;
      }
      if (mergedLines.length > 0 && !/^[•\-\*]\s+/.test(l) && (/^[a-z]/.test(l) || /^[\]\),]/.test(l))) {
        mergedLines[mergedLines.length - 1] = `${mergedLines[mergedLines.length - 1]} ${l}`;
        continue;
      }
      mergedLines.push(l);
    }

    for (const item of mergedLines) {
      let clean = item.replace(/^[•\-\*]\s*/, "").trim();
      clean = this.balanceBrackets(clean);
      if (clean.length < 3) continue;

      const isAward = /Winner|Runner|Rank|Place|Award|Hackathon|Prize|Gold|Silver|Bronze|Honor|Champion|Finalist|Scholarship|Fellowship|Top\s+\d+/i.test(clean);
      if (isAward) {
        results.push({
          entryType: "award",
          title: clean,
          bullets: [clean],
          confidence: 0.92,
          rawSnippet: clean,
        });
      } else {
        const cert = this.parseSingleCertification(clean);
        if (cert) results.push(cert);
      }
    }

    return results;
  }

  /**
   * Parses certifications without falsely splitting ", Issuer (Year)"
   */
  private static parseCertificationBlocks(lines: string[]): StructuredResumeSection[] {
    const results: StructuredResumeSection[] = [];
    const knownIssuers = /(?:Amazon\s+Web\s+Services|AWS|Google|Microsoft|IBM|Meta|Coursera|Udemy|edX|DeepLearning\.AI|Oracle|Cisco|CompTIA|NPTEL|Databricks|Snowflake|HashiCorp)/i;

    for (const line of lines) {
      // Only split on bullet/pipe/semicolon or comma when comma does NOT introduce a known issuer
      const rawItems = line.split(/[|•·;]\s*(?=[A-Z])|,\s*(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
      const mergedItems: string[] = [];

      for (const piece of rawItems) {
        if (mergedItems.length > 0 && knownIssuers.test(piece) && piece.split(/\s+/).length <= 5 && line.includes(`, ${piece}`)) {
          mergedItems[mergedItems.length - 1] = `${mergedItems[mergedItems.length - 1]}, ${piece}`;
        } else {
          mergedItems.push(piece);
        }
      }

      for (const item of mergedItems) {
        const cert = this.parseSingleCertification(item);
        if (cert) results.push(cert);
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

