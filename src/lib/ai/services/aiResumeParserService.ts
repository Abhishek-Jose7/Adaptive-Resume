import { ProviderFactory } from "../providerFactory";
import { ResumeStructuringService, StructuredResumeSection, classifySkills } from "@/lib/parsers/resumeStructuringService";
import { StagedItemInput } from "@/lib/repositories/importRepository";

export interface NormalizedResumeJson {
  name?: string | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    headline?: string | null;
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
  skillGroups?: Array<{
    category: string;
    skills: string[];
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
Your goal is to parse the uploaded resume (whether clean, multi-page, two-column, OCR-noisy, or jumbled) and extract ALL career data cleanly into the NormalizedResumeJson schema.

JSON SCHEMA:
{
  "name": "Full Name or null",
  "contact": {
    "email": "string or null",
    "phone": "string or null",
    "location": "City, State/Country or null",
    "headline": "Brief role/student headline from header or null",
    "links": ["https://github.com/...", "https://linkedin.com/in/..."]
  },
  "summary": "Professional narrative ONLY — NEVER include candidate name, email, phone, location, or links in summary. null if absent.",
  "education": [
    {
      "institution": "University / School",
      "degree": "B.Tech / B.E. / B.S. / Master / Higher Secondary / etc or null",
      "fieldOfStudy": "Computer Science / Engineering / etc or null",
      "grades": "GPA / Percentage / CGPA only if explicitly written, otherwise null",
      "location": "City, Country or null",
      "startDate": "YYYY or Month YYYY or null",
      "endDate": "YYYY or Month YYYY or Present or null",
      "highlights": ["Relevant coursework, thesis, or academic honors — NEVER split grades/coursework into separate education entries"]
    }
  ],
  "experience": [
    {
      "role": "Job Title",
      "organization": "Company or Organization",
      "location": "City, State or Remote or null",
      "startDate": "YYYY or Month YYYY or null",
      "endDate": "YYYY or Month YYYY or Present or null",
      "isCurrent": false,
      "bullets": ["Clean, atomic action statements (fix mid-word OCR spaces; strip repeated page headers/contact info)"],
      "descriptionContext": "Optional brief team or division description"
    }
  ],
  "projects": [
    {
      "title": "Project Name (keep awards/achievements OUT of project titles and bullets)",
      "description": "Short overview or null",
      "technologies": ["Tech1", "Tech2"],
      "bullets": ["Detail bullets"],
      "url": "Project link or null",
      "startDate": "YYYY or Month YYYY or null",
      "endDate": "YYYY or Month YYYY or null"
    }
  ],
  "skillGroups": [
    {
      "category": "Exact skill category heading from resume (e.g. Languages, Frontend / Mobile, Backend / APIs, Databases & Cloud, AI & GenAI, Tools & Others)",
      "skills": ["Skill1", "Skill2"]
    }
  ],
  "skills": {
    "technical": ["All technical skills if not already grouped"],
    "soft": ["Communication, leadership, collaboration, problem solving"]
  },
  "certifications": [
    {
      "title": "Certification Name",
      "issuer": "Issuing Entity (AWS, Google, Coursera, IBM, etc.) or null",
      "issueDate": "Year or Date or null"
    }
  ],
  "achievements": [
    "Hackathon wins, awards, scholarships, competitive rankings explicitly stated — NEVER merge into projects"
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
2. Separate Personal Details (name, email, phone, location, links) cleanly from summary.
3. Preserve skill categories accurately in "skillGroups" (do NOT dump all skills into one Languages or Technical list if categories exist). NEVER repeat a category in both "skillGroups" and "skills.soft" or "skills.technical".
4. NEVER duplicate the same role in both "experience" and "positionsOfResponsibility". Put roles from Work Experience / Professional Experience strictly in "experience", and use "positionsOfResponsibility" ONLY for separate Leadership / Extracurricular / Volunteer sections not already listed in "experience".
5. Repair obvious PDF/OCR mid-word whitespace artifacts (e.g. "Engi neering" -> "Engineering", "scarlett- menezes" -> "scarlett-menezes") without altering facts.
6. Keep Education strictly separate from Work Experience, and keep Achievements strictly separate from Projects.
7. Return pure, valid JSON ONLY. No markdown, no preface, no trailing commentary.`;

  /**
   * Cleans PDF/OCR mid-word spaces and spaced URLs/emails before sending to LLM
   * while preserving natural resume structure (no synthetic section markers).
   */
  private static cleanTextBeforeAi(rawText: string): string {
    return rawText
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ")
      .replace(/[\uE000-\uF0A6\uF0A8-\uF0B6\uF0B8-\uF8FF]/g, " ")
      .replace(/([a-zA-Z0-9_%+-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9_%+-]+)*)[ \t]*@[ \t]*([a-zA-Z0-9-]+(?:[ \t]*\.[ \t]*[a-zA-Z0-9-]+)*)[ \t]*\.[ \t]*([a-zA-Z]{2,})/g, (m) =>
        m.replace(/[ \t]+/g, "")
      )
      .replace(/https?[ \t]*:[ \t]*\/\/[ \t]*/gi, "https://")
      .replace(/((?:github|linkedin)\.com\/[^\s]+?)[ \t]*-[ \t]+([^\s]+)/gi, "$1-$2")
      .replace(/\s*([•·▪●\uF0B7\uF0A7\u2022\u25AA\u25CF\u25BA➢➤‣])\s*/g, "\n• ")
      .replace(/\b([A-Za-z]{2,})[ \t]+(tion|sion|tions|sions|ment|ments|ness|ence|ance|ities|ity|ization|isation)\b/g, "$1$2")
      .trim();
  }

  /**
   * Parses resume from raw text using Pipeline A (Groq / OpenRouter or local fallback)
   */
  static async parseFromText(
    rawText: string,
    sourceLabel: string = "Uploaded Resume",
    options?: { apiKey?: string; model?: string; forceLocal?: boolean; userEmail?: string | null }
  ): Promise<ParseResumeResult> {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Cannot parse empty resume text.");
    }

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
      const cleanedForAi = this.cleanTextBeforeAi(rawText);
      const response = await provider.generateStructured<NormalizedResumeJson>({
        task: "parse_resume",
        systemPrompt: this.SYSTEM_PROMPT,
        userPayload: {
          sourceLabel,
          resumeContent: cleanedForAi,
        },
        schema: {},
        maxOutputTokens: 4096,
        temperature: 0.1,
      });

      // Handle case where Groq/OpenRouter cascaded internally to LocalDeterministicAdapter
      if (response.model === "deterministic-v1" || Array.isArray(response.data)) {
        const localSections = Array.isArray(response.data) && response.data.length > 0
          ? (response.data as unknown as StructuredResumeSection[])
          : ResumeStructuringService.structureResumeText(rawText, sourceLabel);
        const normalized = this.convertStructuredSectionsToNormalized(localSections, sourceLabel);
        const stagedItems = ResumeStructuringService.toStagedItemInputs(localSections);
        return {
          normalized,
          structuredSections: localSections,
          stagedItems,
          parserModel: "local-deterministic-fallback",
          isVision: false,
          ambiguousCount: normalized.ambiguousOrFlagged?.length || 0,
        };
      }

      const normalized = this.sanitizeNormalizedJson(response.data);
      const aiSections = this.convertNormalizedToStructuredSections(normalized, sourceLabel);
      const structuredSections = this.crossCheckAndSupplement(aiSections, rawText, sourceLabel);
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
      console.warn("Pipeline A parsing failed; falling back to local deterministic structuring:", err.message);
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
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        name: null,
        contact: null,
        summary: null,
        education: [],
        experience: [],
        projects: [],
        skillGroups: [],
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
        headline: typeof data.contact.headline === "string" ? data.contact.headline.trim() : null,
        links: Array.isArray(data.contact.links) ? data.contact.links.filter((l: any) => typeof l === "string" && l.trim().length > 0).map((l: string) => l.trim()) : [],
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
        highlights: Array.isArray(e.highlights) ? e.highlights.map(String).filter(Boolean) : [],
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
        technologies: Array.isArray(p.technologies) ? p.technologies.map(String).filter(Boolean) : [],
        bullets: Array.isArray(p.bullets) ? p.bullets.map(String).filter(Boolean) : [],
        url: p.url ? String(p.url) : null,
        startDate: p.startDate && String(p.startDate) !== "null" ? String(p.startDate) : null,
        endDate: p.endDate && String(p.endDate) !== "null" ? String(p.endDate) : null,
      })) : [],
      skillGroups: Array.isArray(data.skillGroups)
        ? data.skillGroups
          .filter((g: any) => g && typeof g === "object" && Array.isArray(g.skills) && g.skills.length > 0)
          .map((g: any) => ({
            category: String(g.category || "Technical Skills").trim(),
            skills: g.skills.map(String).map((s: string) => s.trim()).filter(Boolean),
          }))
        : [],
      skills: {
        technical: Array.isArray(data.skills?.technical) ? data.skills.technical.map(String).filter(Boolean) : [],
        soft: Array.isArray(data.skills?.soft) ? data.skills.soft.map(String).filter(Boolean) : [],
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
   * Cross-checks AI output against deterministic local extraction and supplements
   * any entire section types that an LLM accidentally dropped on multi-page resumes.
   */
  private static crossCheckAndSupplement(
    aiSections: StructuredResumeSection[],
    rawText: string,
    sourceLabel: string
  ): StructuredResumeSection[] {
    const localSections = ResumeStructuringService.structureResumeText(rawText, sourceLabel);
    const merged = [...aiSections];

    const hasPersonal = merged.some((s) => s.entryType === "profile" && s.title === "Personal Details");
    if (!hasPersonal) {
      const localPersonal = localSections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      if (localPersonal) merged.unshift(localPersonal);
    }

    const coreTypes: Array<StructuredResumeSection["entryType"]> = [
      "experience",
      "education",
      "project",
      "skill_group",
      "certification",
      "award",
    ];

    for (const t of coreTypes) {
      if (!merged.some((s) => s.entryType === t)) {
        const localForType = localSections.filter((s) => s.entryType === t);
        if (localForType.length > 0) {
          merged.push(...localForType);
        }
      }
    }

    return merged;
  }

  /**
   * Converts NormalizedResumeJson to StructuredResumeSection array
   */
  static convertNormalizedToStructuredSections(
    norm: NormalizedResumeJson,
    sourceLabel: string
  ): StructuredResumeSection[] {
    const sections: StructuredResumeSection[] = [];

    // 1. Personal Details (emitted cleanly as its own profile entry)
    const contactBullets = [
      norm.contact?.email ? `Email: ${norm.contact.email}` : "",
      norm.contact?.phone ? `Phone: ${norm.contact.phone}` : "",
      norm.contact?.headline ? `Headline: ${norm.contact.headline}` : "",
      ...(norm.contact?.links || []).map((l) => `Link: ${l}`),
    ].filter(Boolean);

    if (norm.name || contactBullets.length > 0 || norm.contact?.location) {
      sections.push({
        entryType: "profile",
        title: "Personal Details",
        organization: norm.name || null,
        location: norm.contact?.location || null,
        descriptionContext: norm.contact?.headline || null,
        bullets: contactBullets.length > 0 ? contactBullets : [norm.name || norm.contact?.location || sourceLabel],
        confidence: 0.98,
        rawSnippet: [norm.name, norm.contact?.location, ...contactBullets].filter(Boolean).join(" | "),
      });
    }

    // 2. Professional Summary (strip leaked contact URLs/emails/phones)
    if (norm.summary) {
      const cleanedSummary = norm.summary
        .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "")
        .replace(/(?:https?:\/\/)?(?:www\.)?(?:github|linkedin)\.com\/\S+/gi, "")
        .replace(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{4}\b/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (cleanedSummary.length > 10) {
        sections.push({
          entryType: "profile",
          title: "Professional Summary",
          organization: null,
          descriptionContext: cleanedSummary,
          bullets: [cleanedSummary],
          confidence: 0.95,
          rawSnippet: cleanedSummary.substring(0, 300),
        });
      }
    }

    // 3. Experience
    for (const exp of norm.experience || []) {
      const cleanBullets = exp.bullets
        .map((b) => ResumeStructuringService.balanceBrackets(b.replace(/^[•\-\*]\s*/, "").trim()))
        .filter(Boolean);
      const isCurrent = Boolean(exp.isCurrent || (exp.endDate && /^(present|current|ongoing)$/i.test(exp.endDate)));
      sections.push({
        entryType: "experience",
        title: exp.role,
        organization: exp.organization,
        location: exp.location || null,
        startDate: exp.startDate || null,
        endDate: isCurrent ? null : (exp.endDate || null),
        isCurrent,
        descriptionContext: exp.descriptionContext || null,
        bullets: cleanBullets.length > 0 ? cleanBullets : [exp.role],
        confidence: 0.95,
        rawSnippet: `${exp.role} at ${exp.organization} (${exp.startDate || ""} - ${exp.endDate || ""})`,
      });
    }

    // 4. Education
    for (const edu of norm.education || []) {
      const bullets = [...(edu.highlights || [])];
      if (edu.grades) {
        bullets.unshift(`Grades / Performance: ${edu.grades}`);
      }
      const degreeTitle = [edu.degree, edu.fieldOfStudy && !edu.degree?.toLowerCase().includes(edu.fieldOfStudy.toLowerCase()) ? `in ${edu.fieldOfStudy}` : ""]
        .filter(Boolean)
        .join(" ")
        .trim();
      const isCurrent = Boolean(edu.endDate && /^(present|current|ongoing|expected)$/i.test(edu.endDate));
      sections.push({
        entryType: "education",
        title: degreeTitle || "Academic Degree",
        organization: edu.institution,
        location: edu.location || null,
        startDate: edu.startDate || null,
        endDate: isCurrent ? null : (edu.endDate || null),
        isCurrent,
        bullets,
        confidence: 0.95,
        rawSnippet: `${degreeTitle} at ${edu.institution}`,
      });
    }

    // 5. Projects
    for (const proj of norm.projects || []) {
      const bullets = [...(proj.bullets || [])];
      if (proj.url) {
        bullets.push(`Link: ${proj.url}`);
      }
      const techContext = proj.technologies && proj.technologies.length > 0
        ? proj.technologies.join(" | ")
        : proj.description || null;
      if (proj.technologies && proj.technologies.length > 0 && bullets.length === 0) {
        bullets.unshift(`Technologies: ${proj.technologies.join(", ")}`);
      }
      sections.push({
        entryType: "project",
        title: proj.title,
        organization: null,
        descriptionContext: techContext,
        startDate: proj.startDate || null,
        endDate: proj.endDate || null,
        bullets: bullets.length > 0 ? bullets : [proj.title],
        confidence: 0.95,
        rawSnippet: proj.title,
      });
    }

    // 6. Skills (prefer structured skillGroups; deduplicate by category name; otherwise classify flat technical list)
    const seenSkillCategories = new Set<string>();
    if (norm.skillGroups && norm.skillGroups.length > 0) {
      for (const group of norm.skillGroups) {
        const catKey = group.category.trim().toLowerCase();
        if (group.skills.length > 0 && !seenSkillCategories.has(catKey)) {
          seenSkillCategories.add(catKey);
          sections.push({
            entryType: "skill_group",
            title: group.category,
            bullets: Array.from(new Set(group.skills)),
            confidence: 0.95,
            rawSnippet: `${group.category}: ${group.skills.join(", ")}`,
          });
        }
      }
    } else if (norm.skills?.technical && norm.skills.technical.length > 0) {
      if (norm.skills.technical.length > 6) {
        const classified = classifySkills(norm.skills.technical);
        for (const group of classified) {
          seenSkillCategories.add(group.category.toLowerCase());
          sections.push({
            entryType: "skill_group",
            title: group.category,
            bullets: group.skills,
            confidence: 0.92,
            rawSnippet: `${group.category}: ${group.skills.join(", ")}`,
          });
        }
      } else {
        seenSkillCategories.add("technical skills");
        sections.push({
          entryType: "skill_group",
          title: "Technical Skills",
          bullets: norm.skills.technical,
          confidence: 0.95,
          rawSnippet: norm.skills.technical.join(", "),
        });
      }
    }

    if (norm.skills?.soft && norm.skills.soft.length > 0 && !seenSkillCategories.has("soft skills") && !seenSkillCategories.has("soft")) {
      seenSkillCategories.add("soft skills");
      sections.push({
        entryType: "skill_group",
        title: "Soft Skills",
        bullets: Array.from(new Set(norm.skills.soft)),
        confidence: 0.95,
        rawSnippet: norm.skills.soft.join(", "),
      });
    }

    // 7. Certifications
    for (const cert of norm.certifications || []) {
      const cleanTitle = ResumeStructuringService.balanceBrackets(cert.title);
      sections.push({
        entryType: "certification",
        title: cleanTitle,
        organization: cert.issuer || null,
        endDate: cert.issueDate || null,
        bullets: [cert.issuer ? `${cleanTitle} — ${cert.issuer}` : cleanTitle],
        confidence: 0.95,
        rawSnippet: cleanTitle,
      });
    }

    // 8. Achievements
    for (const ach of norm.achievements || []) {
      const cleanAch = ResumeStructuringService.balanceBrackets(ach);
      sections.push({
        entryType: "award",
        title: cleanAch,
        bullets: [cleanAch],
        confidence: 0.95,
        rawSnippet: cleanAch,
      });
    }

    // 9. Positions of Responsibility (skip if already represented under Experience)
    const expSignatures = (norm.experience || []).map((e) => ({
      role: e.role.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      org: e.organization.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    }));

    for (const pos of norm.positionsOfResponsibility || []) {
      const posRole = pos.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const posOrg = (pos.organization || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const isDuplicateOfExp = expSignatures.some(
        (exp) =>
          (exp.role === posRole || exp.role.includes(posRole) || posRole.includes(exp.role)) &&
          (!posOrg || !exp.org || exp.org === posOrg || exp.org.includes(posOrg) || posOrg.includes(exp.org))
      );
      if (isDuplicateOfExp) continue;

      const bullets = pos.description
        ? pos.description.split(/\r?\n|•/).map((b) => b.trim()).filter((b) => b.length > 3)
        : [pos.title];
      let startDate: string | null = null;
      let endDate: string | null = null;
      let isCurrent = false;
      if (pos.duration) {
        const parts = pos.duration.split(/\s*(?:-|–|—|\bto\b)\s*/i).map((p) => p.trim()).filter(Boolean);
        startDate = parts[0] || null;
        const endRaw = parts.length > 1 ? parts[parts.length - 1] : null;
        isCurrent = Boolean(endRaw && /^(present|current|ongoing)$/i.test(endRaw));
        endDate = isCurrent ? null : endRaw;
      }
      sections.push({
        entryType: "volunteer",
        title: pos.title,
        organization: pos.organization || null,
        startDate,
        endDate,
        isCurrent,
        descriptionContext: pos.duration || null,
        bullets: bullets.length > 0 ? bullets : [pos.title],
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
