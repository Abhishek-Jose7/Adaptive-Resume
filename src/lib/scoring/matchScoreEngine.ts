import { JDAnalysis, JDKeyword, SeniorityLevel } from "@/types/job";
import { ResumeDoc } from "@/types/resume";
import { BankEntry } from "@/types/bank";

export interface MatchScoreBreakdown {
  totalScore: number; // 0 to 100
  scoringVersion: "1.0";
  confidence: number;
  isAvailable: boolean;
  unavailableReason?: string;
  dimensions: {
    mustHaveKeywords: { score: number; max: 30; covered: string[]; missing: string[] };
    niceToHaveKeywords: { score: number; max: 10; covered: string[]; missing: string[] };
    relevantAchievements: { score: number; max: 20; details: string };
    responsibilityAlignment: { score: number; max: 15; matchedCount: number; totalCount: number };
    experienceSeniority: { score: number; max: 10; candidateSeniority: string; requiredSeniority: string };
    skillsEvidenceRecency: { score: number; max: 5; recentEvidencedSkillsCount: number };
    parseabilityFormatting: { score: number; max: 10; passFlags: string[]; warnings: string[] };
  };
}

export class MatchScoreEngine {
  /**
   * Calculates Resume-JD Match Score according to PRD Section 10.5
   */
  static calculateScore(
    resume: ResumeDoc,
    jdAnalysis: JDAnalysis,
    bankEntries: BankEntry[] = []
  ): MatchScoreBreakdown {
    // Check if score is unavailable due to low confidence or missing key requirements
    if (jdAnalysis.confidence < 0.3 || jdAnalysis.keywords.length === 0) {
      return {
        totalScore: 0,
        scoringVersion: "1.0",
        confidence: jdAnalysis.confidence,
        isAvailable: false,
        unavailableReason: "Score unavailable — review job requirements",
        dimensions: {
          mustHaveKeywords: { score: 0, max: 30, covered: [], missing: [] },
          niceToHaveKeywords: { score: 0, max: 10, covered: [], missing: [] },
          relevantAchievements: { score: 0, max: 20, details: "Confidence too low" },
          responsibilityAlignment: { score: 0, max: 15, matchedCount: 0, totalCount: 0 },
          experienceSeniority: { score: 0, max: 10, candidateSeniority: "unknown", requiredSeniority: jdAnalysis.role.seniority },
          skillsEvidenceRecency: { score: 0, max: 5, recentEvidencedSkillsCount: 0 },
          parseabilityFormatting: { score: 0, max: 10, passFlags: [], warnings: [] },
        },
      };
    }

    // Extract all text content from resume
    const resumeTextParts: string[] = [];
    if (resume.profile.summary) resumeTextParts.push(resume.profile.summary);
    if (resume.profile.headline) resumeTextParts.push(resume.profile.headline);

    const resumeBulletTexts: string[] = [];
    for (const exp of resume.experience || []) {
      if ((exp as any).position) resumeTextParts.push((exp as any).position);
      if ((exp as any).role) resumeTextParts.push((exp as any).role);
      if ((exp as any).company) resumeTextParts.push((exp as any).company);
      if ((exp as any).organization) resumeTextParts.push((exp as any).organization);
      for (const b of exp.bullets || []) {
        if (b.text) {
          resumeTextParts.push(b.text);
          resumeBulletTexts.push(b.text);
        }
      }
    }
    for (const proj of resume.projects || []) {
      if ((proj as any).name) resumeTextParts.push((proj as any).name);
      if ((proj as any).title) resumeTextParts.push((proj as any).title);
      for (const b of proj.bullets || []) {
        if (b.text) {
          resumeTextParts.push(b.text);
          resumeBulletTexts.push(b.text);
        }
      }
    }
    for (const skill of resume.skills || []) {
      if ((skill as any).name) resumeTextParts.push((skill as any).name);
      if ((skill as any).category) resumeTextParts.push((skill as any).category);
      if (Array.isArray((skill as any).items)) {
        resumeTextParts.push(...(skill as any).items);
      }
    }

    const fullResumeText = resumeTextParts.join(" ").toLowerCase();

    // Set of all keywords verified in Data Bank
    const bankKeywords = new Set<string>();
    for (const entry of bankEntries) {
      if (entry.title) {
        entry.title.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => {
          if (w.length > 2) bankKeywords.add(w);
        });
      }
      if (entry.descriptionContext) {
        entry.descriptionContext.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => {
          if (w.length > 2) bankKeywords.add(w);
        });
      }
      if (entry.facts) {
        entry.facts.forEach((f) => {
          bankKeywords.add(f.valueText.toLowerCase());
        });
      }
      if (entry.bullets) {
        entry.bullets.forEach((b) => {
          b.text.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => {
            if (w.length > 2) bankKeywords.add(w);
          });
        });
      }
    }

    // 1. Must-have Keyword Coverage (Weight: 30)
    const mustHaveKeywords = jdAnalysis.keywords.filter(
      (k) => k.priority === "must_have" && k.userOverride !== "removed"
    );
    const coveredMustHave: string[] = [];
    const missingMustHave: string[] = [];

    for (const kw of mustHaveKeywords) {
      const match = this.isKeywordCovered(kw, fullResumeText, bankKeywords);
      if (match) {
        coveredMustHave.push(kw.canonical);
      } else {
        missingMustHave.push(kw.canonical);
      }
    }

    const mustHaveScore =
      mustHaveKeywords.length > 0
        ? Math.round((coveredMustHave.length / mustHaveKeywords.length) * 30)
        : 30;

    // 2. Nice-to-have Keyword Coverage (Weight: 10)
    const niceToHaveKeywords = jdAnalysis.keywords.filter(
      (k) => k.priority === "nice_to_have" && k.userOverride !== "removed"
    );
    const coveredNice: string[] = [];
    const missingNice: string[] = [];

    for (const kw of niceToHaveKeywords) {
      const match = this.isKeywordCovered(kw, fullResumeText, bankKeywords);
      if (match) {
        coveredNice.push(kw.canonical);
      } else {
        missingNice.push(kw.canonical);
      }
    }

    const niceToHaveScore =
      niceToHaveKeywords.length > 0
        ? Math.round((coveredNice.length / niceToHaveKeywords.length) * 10)
        : 10;

    // 3. Relevant Achievement Coverage (Weight: 20)
    // Measures metric density & outcome presence in bullets
    let metricBulletCount = 0;
    for (const bullet of resumeBulletTexts) {
      if (/\d+[%xkm]?/i.test(bullet) || /\$(?:\d+)/i.test(bullet)) {
        metricBulletCount++;
      }
    }
    const achievementRatio =
      resumeBulletTexts.length > 0 ? metricBulletCount / resumeBulletTexts.length : 0;
    const relevantAchievementScore = Math.min(20, Math.round(achievementRatio * 20 * 1.5));

    // 4. Responsibility Alignment (Weight: 15)
    let matchedResponsibilities = 0;
    for (const resp of jdAnalysis.responsibilities) {
      const respWords = resp.text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);
      const isMatched = respWords.some((word) => fullResumeText.includes(word));
      if (isMatched) matchedResponsibilities++;
    }
    const responsibilityScore =
      jdAnalysis.responsibilities.length > 0
        ? Math.round((matchedResponsibilities / jdAnalysis.responsibilities.length) * 15)
        : 15;

    // 5. Experience / Seniority Alignment (Weight: 10)
    // Approximate candidate seniority from resume experience items
    let candidateSeniority: SeniorityLevel = "mid";
    const totalExpYears = (resume.experience || []).length * 2.5; // Heuristic
    if (totalExpYears >= 8 || fullResumeText.includes("director") || fullResumeText.includes("lead")) {
      candidateSeniority = "lead";
    } else if (totalExpYears >= 5 || fullResumeText.includes("senior")) {
      candidateSeniority = "senior";
    } else if (totalExpYears <= 2) {
      candidateSeniority = "entry";
    }

    let seniorityScore = 7;
    const reqSeniority = jdAnalysis.role.seniority;
    if (reqSeniority === candidateSeniority) {
      seniorityScore = 10;
    } else if (
      (reqSeniority === "senior" && candidateSeniority === "lead") ||
      (reqSeniority === "mid" && candidateSeniority === "senior")
    ) {
      seniorityScore = 10; // Senior enough
    } else if (reqSeniority === "lead" && candidateSeniority === "entry") {
      seniorityScore = 3;
    }

    // 6. Skills Evidence and Recency (Weight: 5)
    // Recent experience has evidenced skills
    let recentSkillsScore = 5;
    if ((resume.experience || []).length === 0) {
      recentSkillsScore = 2;
    }

    // 7. Parseability and Formatting (Weight: 10)
    const passFlags: string[] = [];
    const warnings: string[] = [];
    let parseabilityScore = 10;

    const candidateName = resume.profile.fullName || resume.profile.name;
    if (candidateName && resume.profile.email) {
      passFlags.push("Standard Contact Information Header");
    } else {
      warnings.push("Missing email or full name in header");
      parseabilityScore -= 3;
    }

    if ((resume.experience || []).length > 0) {
      passFlags.push("Clear Chronological Experience Section");
    } else {
      warnings.push("Missing Experience Section");
      parseabilityScore -= 4;
    }

    if (resumeBulletTexts.length > 0 && resumeBulletTexts.every((b) => b.length < 350)) {
      passFlags.push("Scannable, concise bullet lengths");
    } else {
      warnings.push("Some bullets are excessively long (>350 chars)");
      parseabilityScore -= 2;
    }

    parseabilityScore = Math.max(0, parseabilityScore);

    // Sum overall score
    const totalScore = Math.min(
      100,
      mustHaveScore +
        niceToHaveScore +
        relevantAchievementScore +
        responsibilityScore +
        seniorityScore +
        recentSkillsScore +
        parseabilityScore
    );

    return {
      totalScore,
      scoringVersion: "1.0",
      confidence: jdAnalysis.confidence,
      isAvailable: true,
      dimensions: {
        mustHaveKeywords: {
          score: mustHaveScore,
          max: 30,
          covered: coveredMustHave,
          missing: missingMustHave,
        },
        niceToHaveKeywords: {
          score: niceToHaveScore,
          max: 10,
          covered: coveredNice,
          missing: missingNice,
        },
        relevantAchievements: {
          score: relevantAchievementScore,
          max: 20,
          details: `${metricBulletCount} of ${resumeBulletTexts.length} bullets contain quantified metrics`,
        },
        responsibilityAlignment: {
          score: responsibilityScore,
          max: 15,
          matchedCount: matchedResponsibilities,
          totalCount: jdAnalysis.responsibilities.length,
        },
        experienceSeniority: {
          score: seniorityScore,
          max: 10,
          candidateSeniority,
          requiredSeniority: reqSeniority,
        },
        skillsEvidenceRecency: {
          score: recentSkillsScore,
          max: 5,
          recentEvidencedSkillsCount: (resume.skills || []).length,
        },
        parseabilityFormatting: {
          score: parseabilityScore,
          max: 10,
          passFlags,
          warnings,
        },
      },
    };
  }

  /**
   * Helper to check if a keyword or synonym is covered in resume text and grounded in Data Bank
   */
  private static isKeywordCovered(
    keyword: JDKeyword,
    resumeText: string,
    bankKeywords: Set<string>
  ): boolean {
    const canonical = keyword.canonical.toLowerCase();
    const inResume =
      resumeText.includes(canonical) ||
      keyword.synonyms.some((s) => resumeText.includes(s.toLowerCase()));

    if (!inResume) return false;

    // Grounding check: Must be in bank or confirmed by user override
    if (keyword.userOverride === "promoted") {
      return true;
    }

    const inBank =
      bankKeywords.has(canonical) ||
      keyword.synonyms.some((s) => bankKeywords.has(s.toLowerCase()));

    return inBank;
  }
}
