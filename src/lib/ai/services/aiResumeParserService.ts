import { ProviderFactory } from "../providerFactory";
import { ResumeStructuringService, StructuredResumeSection } from "@/lib/parsers/resumeStructuringService";
import { StagedItemInput } from "@/lib/repositories/importRepository";

export interface NormalizedResumeJson {
  name?: string | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    links?: string[];
  } | null;
  summary?: string | null;
  education?: Array<{
    institution: string;
    degree?: string | null;
    fieldOfStudy?: string | null;
    grades?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    highlights?: string[];
  }>;
  experience?: Array<{
    role: string;
    organization: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    bullets: string[];
    descriptionContext?: string | null;
  }>;
  projects?: Array<{
    title: string;
    description?: string | null;
    technologies?: string[];
    bullets?: string[];
    url?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  skills?: {
    technical?: string[];
    soft?: string[];
  };
  certifications?: Array<{
    title: string;
    issuer?: string | null;
    issueDate?: string | null;
  }>;
  achievements?: string[];
  positionsOfResponsibility?: Array<{
    title: string;
    organization?: string | null;
    duration?: string | null;
    description?: string | null;
  }>;
  ambiguousOrFlagged?: Array<{
    field: string;
    snippet: string;
    reason: string;
  }>;
}

export interface ParseResumeResult {
  normalized: NormalizedResumeJson;
  structuredSections: StructuredResumeSection[];
  stagedItems: StagedItemInput[];
  parserModel: string;
  isVision: boolean;
  ambiguousCount: number;
}

export class AiResumeParserService {
  /**
   * System Prompt enforcing Section 18 / Dual-Model Pipeline A requirements:
   * 1. Output clean normalized JSON.
   * 2. NEVER invent missing details, dates, or metrics.
   * 3. Flag ambiguous or incomplete information.
   */
  private static readonly SYSTEM_PROMPT = `You are a dedicated AI Resume Parser operating as Pipeline A.
Your goal is to parse the uploaded resume and extract all career data into the NormalizedResumeJson schema.

JSON SCHEMA:
{
  "name": "Full Name or null",
  "contact": {
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "links": ["https://..."]
  },
  "summary": "string or null",
  "education": [
    {
      "institution": "University / School",
      "degree": "B.E. / B.S. / Master / etc or null",
      "fieldOfStudy": "Computer Engineering / etc or null",
      "grades": "GPA / Percentage / CGPA only if explicitly written, otherwise null",
      "location": "City, Country or null",
      "startDate": "YYYY or Month YYYY or null",
      "endDate": "YYYY or Month YYYY or null",
      "highlights": ["Relevant coursework, thesis, or academic honors"]
    }
  ],
  "experience": [
    {
      "role": "Job Title",
      "organization": "Company or Organization",
      "location": "City, State or Remote or null",
      "startDate": "YYYY or Month YYYY or null",
      "endDate": "YYYY or Present or null",
      "isCurrent": false,
      "bullets": ["Action-oriented responsibility or accomplishment statements"],
      "descriptionContext": "Optional brief team or division description"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Short overview or null",
      "technologies": ["Tech1", "Tech2"],
      "bullets": ["Detail bullets"],
      "url": "Project link or null",
      "startDate": "null",
      "endDate": "null"
    }
  ],
  "skills": {
    "technical": ["Languages, frameworks, databases, tools, cloud platforms"],
    "soft": ["Communication, leadership, collaboration, problem solving"]
  },
  "certifications": [
    {
      "title": "Certification Name",
      "issuer": "Issuing Entity or null",
      "issueDate": "Date or null"
    }
  ],
  "achievements": [
    "Hackathon wins, awards, scholarships, competitive rankings explicitly stated"
  ],
  "positionsOfResponsibility": [
    {
      "title": "Lead / Coordinator / Associate / Head",
      "organization": "Club, Society, Event, Student Body",
      "duration": "Dates or null",
      "description": "What they managed or organized"
    }
  ],
  "ambiguousOrFlagged": [
    {
      "field": "education.grades / experience.dates / etc",
      "snippet": "exact snippet text",
      "reason": "Date overlap, missing graduation year, or ambiguous company name"
    }
  ]
}

STRICT ANTI-FABRICATION AND PARSING RULES:
1. NEVER invent, extrapolate, or guess dates, metrics, percentages, institutions, grades, or employers.
2. If any piece of information is missing, leave it as null or omit it.
3. If information is ambiguous, contradictory, or hard to read, record it in "ambiguousOrFlagged" for human review.
4. Separate technical skills from soft skills accurately.
5. If the resume contains positions of responsibility (e.g. Lead, Technical Associate in clubs/societies), place them in positionsOfResponsibility or experience.
6. Return pure, valid JSON ONLY. No markdown, no preface, no trailing commentary.`;

  /**
   * Parses resume from raw text using Pipeline A (OpenRouter ling-3.2-flash:free or local fallback)
   */
  static async parseFromText(
    rawText: string,
    sourceLabel: string = "Uploaded Resume",
    options?: { apiKey?: string; model?: string; forceLocal?: boolean; userEmail?: string | null }
  ): Promise<ParseResumeResult> {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Cannot parse empty resume text.");
    }

    // If local mode is requested or no OpenRouter key is configured, use deterministic structuring
    const provider = ProviderFactory.getParserProvider(options?.apiKey, options?.model, options?.userEmail);

    if (options?.forceLocal || provider.name === "local-deterministic") {
      const structuredSections = ResumeStructuringService.structureResumeText(rawText, sourceLabel);
      const normalized = this.convertStructuredSectionsToNormalized(structuredSections, sourceLabel);
      const stagedItems = ResumeStructuringService.toStagedItemInputs(structuredSections);

      return {
        normalized,
        structuredSections,
        stagedItems,
        parserModel: "local-deterministic",
        isVision: false,
        ambiguousCount: normalized.ambiguousOrFlagged?.length || 0,
      };
    }

    try {
      const response = await provider.generateStructured<NormalizedResumeJson>({
        task: "parse_resume",
        systemPrompt: this.SYSTEM_PROMPT,
        userPayload: {
          sourceLabel,
          resumeContent: rawText,
        },
        schema: {},
        maxOutputTokens: 4096,
        temperature: 0.1,
      });

      const normalized = this.sanitizeNormalizedJson(response.data);
      const structuredSections = this.convertNormalizedToStructuredSections(normalized, sourceLabel);
      const stagedItems = ResumeStructuringService.toStagedItemInputs(structuredSections);

      return {
        normalized,
        structuredSections,
        stagedItems,
        parserModel: response.model,
        isVision: false,
        ambiguousCount: normalized.ambiguousOrFlagged?.length || 0,
      };
    } catch (err: any) {
      console.warn("Pipeline A OpenRouter parsing failed; falling back to local deterministic structuring:", err.message);
      // Graceful local fallback
      const structuredSections = ResumeStructuringService.structureResumeText(rawText, sourceLabel);
      const normalized = this.convertStructuredSectionsToNormalized(structuredSections, sourceLabel);
      const stagedItems = ResumeStructuringService.toStagedItemInputs(structuredSections);

      return {
        normalized,
        structuredSections,
        stagedItems,
        parserModel: "local-deterministic-fallback",
        isVision: false,
        ambiguousCount: normalized.ambiguousOrFlagged?.length || 0,
      };
    }
  }

  /**
   * Parses resume using Multimodal Vision inference (for scanned PDFs or JPG/PNG/WebP images)
   */
  static async parseFromVisionImage(
    base64Data: string,
    mimeType: string = "image/png",
    sourceLabel: string = "Scanned Resume",
    options?: { apiKey?: string; model?: string }
  ): Promise<ParseResumeResult> {
    if (!base64Data || base64Data.trim().length === 0) {
      throw new Error("Cannot parse empty image payload.");
    }

    const provider = ProviderFactory.getParserProvider(options?.apiKey, options?.model);

    try {
      const response = await provider.generateStructured<NormalizedResumeJson>({
        task: "vision",
        systemPrompt: `${this.SYSTEM_PROMPT}\n\nNOTE: You are analyzing a high-resolution scan/image of a resume. Read all text, tables, columns, and dates carefully.`,
        userPayload: {
          sourceLabel,
          instruction: "Extract all structured resume sections from the provided document image.",
        },
        images: [
          {
            mimeType,
            base64Data: base64Data.replace(/^data:[^;]+;base64,/, ""),
          },
        ],
        schema: {},
        maxOutputTokens: 4096,
        temperature: 0.1,
      });

      const normalized = this.sanitizeNormalizedJson(response.data);
      const structuredSections = this.convertNormalizedToStructuredSections(normalized, sourceLabel);
      const stagedItems = ResumeStructuringService.toStagedItemInputs(structuredSections);

      return {
        normalized,
        structuredSections,
        stagedItems,
        parserModel: response.model,
        isVision: true,
        ambiguousCount: normalized.ambiguousOrFlagged?.length || 0,
      };
    } catch (err: any) {
      console.warn("Pipeline A Vision parsing failed:", err.message);
      throw new Error(`Vision inference failed for ${sourceLabel}: ${err.message}`);
    }
  }

  /**
   * Sanitizes and verifies normalized JSON from AI to ensure required arrays exist
   * and no undefined values cause downstream breakage.
   */
  static sanitizeNormalizedJson(data: any): NormalizedResumeJson {
    if (!data || typeof data !== "object") {
      return {
        name: null,
        contact: null,
        summary: null,
        education: [],
        experience: [],
        projects: [],
        skills: { technical: [], soft: [] },
        certifications: [],
        achievements: [],
        positionsOfResponsibility: [],
        ambiguousOrFlagged: [],
      };
    }

    return {
      name: typeof data.name === "string" ? data.name.trim() : null,
      contact: data.contact && typeof data.contact === "object" ? {
        email: typeof data.contact.email === "string" ? data.contact.email.trim() : null,
        phone: typeof data.contact.phone === "string" ? data.contact.phone.trim() : null,
        location: typeof data.contact.location === "string" ? data.contact.location.trim() : null,
        links: Array.isArray(data.contact.links) ? data.contact.links.filter((l: any) => typeof l === "string") : [],
      } : null,
      summary: typeof data.summary === "string" ? data.summary.trim() : null,
      education: Array.isArray(data.education) ? data.education.map((e: any) => ({
        institution: String(e.institution || "Institution"),
        degree: e.degree ? String(e.degree) : null,
        fieldOfStudy: e.fieldOfStudy ? String(e.fieldOfStudy) : null,
        grades: e.grades ? String(e.grades) : null,
        location: e.location ? String(e.location) : null,
        startDate: e.startDate ? String(e.startDate) : null,
        endDate: e.endDate ? String(e.endDate) : null,
        highlights: Array.isArray(e.highlights) ? e.highlights.map(String) : [],
      })) : [],
      experience: Array.isArray(data.experience) ? data.experience.map((exp: any) => ({
        role: String(exp.role || "Role"),
        organization: String(exp.organization || "Organization"),
        location: exp.location ? String(exp.location) : null,
        startDate: exp.startDate ? String(exp.startDate) : null,
        endDate: exp.endDate ? String(exp.endDate) : null,
        isCurrent: Boolean(exp.isCurrent),
        bullets: Array.isArray(exp.bullets) ? exp.bullets.map(String).filter(Boolean) : [],
        descriptionContext: exp.descriptionContext ? String(exp.descriptionContext) : null,
      })) : [],
      projects: Array.isArray(data.projects) ? data.projects.map((p: any) => ({
        title: String(p.title || "Project"),
        description: p.description ? String(p.description) : null,
        technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
        bullets: Array.isArray(p.bullets) ? p.bullets.map(String).filter(Boolean) : [],
        url: p.url ? String(p.url) : null,
        startDate: p.startDate ? String(p.startDate) : null,
        endDate: p.endDate ? String(p.endDate) : null,
      })) : [],
      skills: {
        technical: Array.isArray(data.skills?.technical) ? data.skills.technical.map(String) : [],
        soft: Array.isArray(data.skills?.soft) ? data.skills.soft.map(String) : [],
      },
      certifications: Array.isArray(data.certifications) ? data.certifications.map((c: any) => ({
        title: String(c.title || "Certification"),
        issuer: c.issuer ? String(c.issuer) : null,
        issueDate: c.issueDate ? String(c.issueDate) : null,
      })) : [],
      achievements: Array.isArray(data.achievements) ? data.achievements.map(String).filter(Boolean) : [],
      positionsOfResponsibility: Array.isArray(data.positionsOfResponsibility) ? data.positionsOfResponsibility.map((r: any) => ({
        title: String(r.title || "Position of Responsibility"),
        organization: r.organization ? String(r.organization) : null,
        duration: r.duration ? String(r.duration) : null,
        description: r.description ? String(r.description) : null,
      })) : [],
      ambiguousOrFlagged: Array.isArray(data.ambiguousOrFlagged) ? data.ambiguousOrFlagged.map((a: any) => ({
        field: String(a.field || "unknown"),
        snippet: String(a.snippet || ""),
        reason: String(a.reason || ""),
      })) : [],
    };
  }

  /**
   * Converts NormalizedResumeJson to StructuredResumeSection array
   */
  static convertNormalizedToStructuredSections(
    norm: NormalizedResumeJson,
    sourceLabel: string
  ): StructuredResumeSection[] {
    const sections: StructuredResumeSection[] = [];

    // 1. Profile / Summary
    if (norm.summary) {
      sections.push({
        entryType: "profile",
        title: norm.name ? `${norm.name} - Summary` : "Professional Summary",
        organization: null,
        descriptionContext: norm.summary,
        bullets: [norm.summary],
        confidence: 0.95,
        rawSnippet: norm.summary.substring(0, 300),
      });
    }

    // 2. Experience
    for (const exp of norm.experience || []) {
      sections.push({
        entryType: "experience",
        title: exp.role,
        organization: exp.organization,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrent: exp.isCurrent,
        descriptionContext: exp.descriptionContext,
        bullets: exp.bullets,
        confidence: 0.95,
        rawSnippet: `${exp.role} at ${exp.organization} (${exp.startDate || ""} - ${exp.endDate || ""})`,
      });
    }

    // 3. Education
    for (const edu of norm.education || []) {
      const bullets = [...(edu.highlights || [])];
      if (edu.grades) {
        bullets.unshift(`Grades / Performance: ${edu.grades}`);
      }
      sections.push({
        entryType: "education",
        title: edu.degree || edu.fieldOfStudy || "Academic Degree",
        organization: edu.institution,
        location: edu.location,
        startDate: edu.startDate,
        endDate: edu.endDate,
        bullets,
        confidence: 0.95,
        rawSnippet: `${edu.degree || ""} at ${edu.institution}`,
      });
    }

    // 4. Projects
    for (const proj of norm.projects || []) {
      const bullets = [...(proj.bullets || [])];
      if (proj.technologies && proj.technologies.length > 0) {
        bullets.unshift(`Technologies: ${proj.technologies.join(", ")}`);
      }
      sections.push({
        entryType: "project",
        title: proj.title,
        organization: null,
        descriptionContext: proj.description,
        startDate: proj.startDate,
        endDate: proj.endDate,
        bullets,
        confidence: 0.95,
        rawSnippet: proj.title,
      });
    }

    // 5. Skills
    if (norm.skills?.technical && norm.skills.technical.length > 0) {
      sections.push({
        entryType: "skill_group",
        title: "Technical Skills",
        bullets: norm.skills.technical,
        confidence: 0.95,
        rawSnippet: norm.skills.technical.join(", "),
      });
    }
    if (norm.skills?.soft && norm.skills.soft.length > 0) {
      sections.push({
        entryType: "skill_group",
        title: "Soft Skills",
        bullets: norm.skills.soft,
        confidence: 0.95,
        rawSnippet: norm.skills.soft.join(", "),
      });
    }

    // 6. Certifications
    for (const cert of norm.certifications || []) {
      sections.push({
        entryType: "certification",
        title: cert.title,
        organization: cert.issuer,
        endDate: cert.issueDate,
        bullets: [cert.title],
        confidence: 0.95,
        rawSnippet: cert.title,
      });
    }

    // 7. Achievements
    for (const ach of norm.achievements || []) {
      sections.push({
        entryType: "award",
        title: ach,
        bullets: [ach],
        confidence: 0.95,
        rawSnippet: ach,
      });
    }

    // 8. Positions of Responsibility
    for (const pos of norm.positionsOfResponsibility || []) {
      sections.push({
        entryType: "volunteer",
        title: pos.title,
        organization: pos.organization,
        descriptionContext: pos.duration,
        bullets: pos.description ? [pos.description] : [pos.title],
        confidence: 0.95,
        rawSnippet: `${pos.title} - ${pos.organization || ""}`,
      });
    }

    return sections;
  }

  /**
   * Helper to convert local structured sections into NormalizedResumeJson
   */
  private static convertStructuredSectionsToNormalized(
    sections: StructuredResumeSection[],
    sourceLabel: string
  ): NormalizedResumeJson {
    const norm: NormalizedResumeJson = {
      name: null,
      contact: null,
      summary: null,
      education: [],
      experience: [],
      projects: [],
      skills: { technical: [], soft: [] },
      certifications: [],
      achievements: [],
      positionsOfResponsibility: [],
      ambiguousOrFlagged: [],
    };

    for (const sec of sections) {
      if (sec.entryType === "profile") {
        norm.summary = sec.bullets.join(" ") || sec.descriptionContext || null;
      } else if (sec.entryType === "experience") {
        norm.experience!.push({
          role: sec.title,
          organization: sec.organization || "Company",
          location: sec.location,
          startDate: sec.startDate,
          endDate: sec.endDate,
          isCurrent: sec.isCurrent,
          bullets: sec.bullets,
          descriptionContext: sec.descriptionContext,
        });
      } else if (sec.entryType === "education") {
        norm.education!.push({
          institution: sec.organization || "University",
          degree: sec.title,
          startDate: sec.startDate,
          endDate: sec.endDate,
          highlights: sec.bullets,
        });
      } else if (sec.entryType === "project") {
        norm.projects!.push({
          title: sec.title,
          description: sec.descriptionContext,
          bullets: sec.bullets,
        });
      } else if (sec.entryType === "skill_group") {
        if (/soft/i.test(sec.title)) {
          norm.skills!.soft!.push(...sec.bullets);
        } else {
          norm.skills!.technical!.push(...sec.bullets);
        }
      } else if (sec.entryType === "certification") {
        norm.certifications!.push({
          title: sec.title,
          issuer: sec.organization,
          issueDate: sec.endDate,
        });
      } else if (sec.entryType === "award") {
        norm.achievements!.push(sec.title);
      } else if (sec.entryType === "volunteer") {
        norm.positionsOfResponsibility!.push({
          title: sec.title,
          organization: sec.organization,
          description: sec.bullets.join("; "),
        });
      }
    }

    return norm;
  }
}
