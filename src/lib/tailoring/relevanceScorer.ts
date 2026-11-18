import { AchievementBullet, BankEntry } from "@/types/bank";
import { JDAnalysis } from "@/types/job";

export interface BulletRelevanceBreakdown {
  bulletId: string;
  totalScore: number; // 0 to 100
  mustHaveScore: number; // max 30
  responsibilityScore: number; // max 20
  outcomeScore: number; // max 15
  domainScore: number; // max 10
  recencyScore: number; // max 10
  seniorityScore: number; // max 10
  importanceScore: number; // max 5
  matchedKeywords: string[];
  isExcluded: boolean;
}

export class RelevanceScorer {
  /**
   * Scores a bullet against structured JD analysis
   * PRD Section 10.2
   */
  static scoreBullet(
    bullet: AchievementBullet,
    parentEntry: BankEntry,
    jdAnalysis: JDAnalysis
  ): BulletRelevanceBreakdown {
    // Exclusions override all scores (PRD 10.2)
    if (bullet.usagePolicy === "never_use" || bullet.usagePolicy === "exclude_from_job") {
      return {
        bulletId: bullet.id,
        totalScore: 0,
        mustHaveScore: 0,
        responsibilityScore: 0,
        outcomeScore: 0,
        domainScore: 0,
        recencyScore: 0,
        seniorityScore: 0,
        importanceScore: 0,
        matchedKeywords: [],
        isExcluded: true,
      };
    }

    const bulletLower = bullet.text.toLowerCase();
    const entryContextLower = (parentEntry.descriptionContext || "").toLowerCase();

    // 1. Must-have skill/keyword evidence (Weight: 30)
    let mustHaveScore = 0;
    const matchedKeywords: string[] = [];

    const mustHaveKws = jdAnalysis.keywords.filter(
      (k) => k.priority === "must_have" && k.userOverride !== "removed"
    );
    for (const kw of mustHaveKws) {
      const matchInBullet = bulletLower.includes(kw.canonical.toLowerCase());
      const matchInSynonyms = kw.synonyms.some((s) => bulletLower.includes(s.toLowerCase()));
      const matchInFacts = bullet.facts?.some(
        (f) =>
          f.valueText.toLowerCase().includes(kw.canonical.toLowerCase()) ||
          kw.synonyms.some((s) => f.valueText.toLowerCase().includes(s.toLowerCase()))
      );

      if (matchInBullet || matchInSynonyms || matchInFacts) {
        matchedKeywords.push(kw.canonical);
        mustHaveScore += 10;
      }
    }
    mustHaveScore = Math.min(mustHaveScore, 30);

    // 2. Responsibility similarity (Weight: 20)
    let responsibilityScore = 0;
    for (const resp of jdAnalysis.responsibilities) {
      const respWords = resp.text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4);

      let wordMatches = 0;
      for (const w of respWords) {
        if (bulletLower.includes(w)) wordMatches++;
      }

      if (wordMatches >= 2) {
        responsibilityScore += 10;
        break;
      }
    }
    responsibilityScore = Math.min(responsibilityScore, 20);

    // 3. Achievement / outcome relevance (Weight: 15)
    let outcomeScore = 0;
    const hasMetricFact = bullet.facts?.some(
      (f) => f.factType === "metric" || f.valueNumber != null
    );
    const hasOutcomeWords = /\b(increased|reduced|improved|scaled|generated|delivered|launched|optimized)\b/i.test(
      bullet.text
    );
    if (hasMetricFact) outcomeScore += 10;
    if (hasOutcomeWords) outcomeScore += 5;
    outcomeScore = Math.min(outcomeScore, 15);

    // 4. Domain / context match (Weight: 10)
    let domainScore = 0;
    for (const domain of jdAnalysis.role.domain) {
      if (
        bulletLower.includes(domain.toLowerCase()) ||
        entryContextLower.includes(domain.toLowerCase())
      ) {
        domainScore += 10;
        break;
      }
    }
    domainScore = Math.min(domainScore, 10);

    // 5. Recency (Weight: 10, capped decay)
    let recencyScore = 5; // baseline
    if (parentEntry.isCurrent) {
      recencyScore = 10;
    } else if (parentEntry.endDate) {
      const year = parseInt(parentEntry.endDate.substring(0, 4), 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(year)) {
        const diff = currentYear - year;
        if (diff <= 2) recencyScore = 10;
        else if (diff <= 5) recencyScore = 8;
        else recencyScore = 5;
      }
    }

    // 6. Role / seniority alignment (Weight: 10)
    let seniorityScore = 5;
    const titleLower = parentEntry.title.toLowerCase();
    if (jdAnalysis.role.seniority !== "unknown") {
      if (titleLower.includes(jdAnalysis.role.seniority)) {
        seniorityScore = 10;
      }
    }

    // 7. User importance (Weight: 5)
    const importanceScore = 5; // default baseline

    const totalScore = Math.min(
      100,
      mustHaveScore +
        responsibilityScore +
        outcomeScore +
        domainScore +
        recencyScore +
        seniorityScore +
        importanceScore
    );

    return {
      bulletId: bullet.id,
      totalScore,
      mustHaveScore,
      responsibilityScore,
      outcomeScore,
      domainScore,
      recencyScore,
      seniorityScore,
      importanceScore,
      matchedKeywords,
      isExcluded: false,
    };
  }
}
