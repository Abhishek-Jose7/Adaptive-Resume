import { JDAnalysis, JDKeyword, JDResponsibility, SeniorityLevel, WorkMode } from "@/types/job";
import { JDAnalysisSchema } from "@/lib/validation/job";
import { ROLE_FIT_TAXONOMY, SOFT_SKILL_TAXONOMY } from "@/lib/scoring/roleFitInsight";
import crypto from "crypto";

export class JDAnalysisService {
  /**
   * Deterministic rule-based extractor (used as baseline and zero-cost fallback)
   */
  static analyzeDeterministic(rawText: string, promptVersion = "v1"): JDAnalysis {
    const textLower = rawText.toLowerCase();

    // 1. Detect Seniority from opening section or title first
    const headerSlice = rawText.substring(0, 400).toLowerCase();
    let seniority: SeniorityLevel = "unknown";

    if (/\b(intern|internship)\b/i.test(headerSlice)) seniority = "intern";
    else if (/\b(entry[- ]level|new grad|associate)\b/i.test(headerSlice)) seniority = "entry";
    else if (/\b(junior|jr\.?)\b/i.test(headerSlice)) seniority = "junior";
    else if (/\b(staff|principal)\b/i.test(headerSlice)) seniority = "lead";
    else if (/\b(senior|sr\.?)\b/i.test(headerSlice)) seniority = "senior";
    else if (/\b(lead|architect)\b/i.test(headerSlice)) seniority = "lead";
    else if (/\b(engineering manager|eng manager|director)\b/i.test(headerSlice)) seniority = "manager";
    else if (/\b(vp|vice president|cto|executive)\b/i.test(headerSlice)) seniority = "executive";
    else if (/\b(mid|intermediate)\b/i.test(headerSlice)) seniority = "mid";
    else if (/\b(senior|sr\.?)\b/i.test(rawText)) seniority = "senior";

    // 2. Detect Work Mode
    let workMode: WorkMode = "unknown";
    if (/\b(remote|work from home|wfh)\b/i.test(rawText)) workMode = "remote";
    else if (/\b(hybrid)\b/i.test(rawText)) workMode = "hybrid";
    else if (/\b(on[- ]site|in[- ]office)\b/i.test(rawText)) workMode = "onsite";

    // 3. Detect Years of Experience
    let yearsMin: number | null = null;
    let yearsMax: number | null = null;
    const yoeMatch = rawText.match(/(\d+)(?:\s*(?:-|to)\s*(\d+))?\+?\s*years?(?:\s+of)?\s+experience/i);
    if (yoeMatch) {
      yearsMin = parseInt(yoeMatch[1], 10);
      if (yoeMatch[2]) yearsMax = parseInt(yoeMatch[2], 10);
    }

    // 4. Extract technical skills, tools, domains, and soft skills with canonical forms and aliases
    const skillDictionary = [
      ...ROLE_FIT_TAXONOMY,
      ...SOFT_SKILL_TAXONOMY,
      { canonical: "Kafka", aliases: ["Apache Kafka"], category: "tool" as const, pattern: /\b(kafka)\b/i },
    ];

    const keywords: JDKeyword[] = [];
    for (const item of skillDictionary) {
      const match = rawText.match(item.pattern);
      if (match) {
        // Must-have if mentioned in requirements / qualifications or repeatedly
        const isMustHave =
          /\b(required|requirements|must have|minimum qualifications|proficiency in)\b/i.test(
            rawText.substring(Math.max(0, (match.index || 0) - 200), (match.index || 0) + 200)
          ) || (match.index || 0) < rawText.length / 2;

        keywords.push({
          id: `kw_${crypto.randomUUID().slice(0, 8)}`,
          canonical: item.canonical,
          synonyms: item.aliases,
          category: item.category,
          priority: isMustHave ? "must_have" : "nice_to_have",
          importance: isMustHave ? 0.9 : 0.6,
          evidencePhrase: match[0],
          userOverride: "none",
        });
      }
    }

    // 5. Extract responsibilities from bullet points in raw text
    const lines = rawText.split(/\r?\n/);
    const responsibilities: JDResponsibility[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[•\-\*]\s+/.test(trimmed) || /^(build|design|architect|develop|lead|maintain|collaborate|drive)\b/i.test(trimmed)) {
        const clean = trimmed.replace(/^[•\-\*]\s+/, "");
        if (clean.length > 20 && clean.length < 250) {
          responsibilities.push({
            id: `resp_${crypto.randomUUID().slice(0, 8)}`,
            text: clean,
            priority: "must_have",
            keywords: keywords
              .filter((k) => clean.toLowerCase().includes(k.canonical.toLowerCase()))
              .map((k) => k.canonical),
          });
        }
      }
    }

    const sourceTextHash = crypto
      .createHash("sha256")
      .update(rawText.toLowerCase().replace(/\s+/g, " ").trim())
      .digest("hex");

    const detectedEducation: string[] = [];
    if (/\b(b\.?s\.?|b\.?tech|bachelor(?:'s)?|undergraduate)\b/i.test(rawText)) {
      detectedEducation.push("Bachelor's degree mentioned in posting");
    }
    if (/\b(m\.?s\.?|master(?:'s)?|ph\.?d)\b/i.test(rawText)) {
      detectedEducation.push("Graduate degree mentioned in posting");
    }

    const detectedConstraints: string[] = [];
    if (/\b(work authorization|authorized to work|visa|sponsorship)\b/i.test(rawText)) {
      detectedConstraints.push("Work authorization / visa requirement mentioned");
    }
    if (/\b(security clearance|clearance)\b/i.test(rawText)) {
      detectedConstraints.push("Security clearance requirement mentioned");
    }

    const analysis: JDAnalysis = {
      schemaVersion: 1,
      role: {
        title: null,
        company: null,
        seniority,
        domain: keywords.some((k) => k.category === "domain")
          ? keywords.filter((k) => k.category === "domain").map((k) => k.canonical)
          : [],
        location: null,
        workMode,
        yearsExperience: {
          min: yearsMin,
          max: yearsMax,
        },
        education: detectedEducation,
      },
      keywords,
      responsibilities: responsibilities.slice(0, 15),
      constraints: detectedConstraints,
      ambiguityFlags: keywords.length < 3 ? ["Few technical keywords detected"] : [],
      confidence:
        keywords.length >= 3 && responsibilities.length > 0
          ? 0.85
          : keywords.length > 0 || responsibilities.length > 0
            ? 0.65
            : 0.3,
      sourceTextHash,
      promptVersion,
    };

    return JDAnalysisSchema.parse(analysis);
  }
}
