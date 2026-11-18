import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet, BulletFact } from "@/types/bank";
import { EvaluatedRequirement, EvidenceMatchStatus } from "@/types/job";

export interface EnhancedJdIntelligenceReport {
  jobId: string;
  mandatoryRequirements: EvaluatedRequirement[];
  preferredQualifications: EvaluatedRequirement[];
  technicalCompetencies: EvaluatedRequirement[];
  responsibilities: EvaluatedRequirement[];
  impliedExpectations: EvaluatedRequirement[];
  summary: {
    confirmedMatchesCount: number;
    partialMatchesCount: number;
    missingEvidenceCount: number;
    genuineGapsCount: number;
    matchReadinessPercent: number;
  };
}

export class JdIntelligenceService {
  /**
   * Performs deep semantic qualification categorization and strictly grounded candidate gap mapping.
   */
  static analyzeQualifications(
    jdAnalysis: JDAnalysis,
    bankEntries: BankEntry[],
    bullets: AchievementBullet[],
    facts: BulletFact[]
  ): EnhancedJdIntelligenceReport {
    // 1. Gather candidate vocabulary and facts
    const verifiedSkillsMap = new Map<string, string[]>(); // canonical skill -> bullet texts
    const factsMap = new Map<string, BulletFact[]>(); // key -> facts

    for (const b of bullets) {
      const lower = b.text.toLowerCase();
      // associate words with this bullet
      lower.split(/[\s,.;:()]+/).forEach((word) => {
        if (word.length > 2) {
          const list = verifiedSkillsMap.get(word) || [];
          list.push(b.text);
          verifiedSkillsMap.set(word, list);
        }
      });
    }

    for (const f of facts) {
      const val = f.valueText.toLowerCase();
      const list = factsMap.get(val) || [];
      list.push(f);
      factsMap.set(val, list);

      // also register fact value in skills map
      const bList = verifiedSkillsMap.get(val) || [];
      if (f.bulletId) {
        const matchingBullet = bullets.find((b) => b.id === f.bulletId);
        if (matchingBullet) bList.push(matchingBullet.text);
      }
      verifiedSkillsMap.set(val, bList);
    }

    // 2. Evaluate Keywords (Mandatory vs Preferred vs Technical)
    const mandatoryRequirements: EvaluatedRequirement[] = [];
    const preferredQualifications: EvaluatedRequirement[] = [];
    const technicalCompetencies: EvaluatedRequirement[] = [];

    for (const kw of jdAnalysis.keywords || []) {
      const canonical = (kw.canonical || (kw as any).term || "").toLowerCase();
      const synonyms = (kw.synonyms || []).map((s) => s.toLowerCase());
      const allTerms = [canonical, ...synonyms].filter(Boolean);

      // Check candidate evidence
      let status: EvidenceMatchStatus = "genuine_gap";
      let matchingBullets: string[] = [];

      for (const term of allTerms) {
        const matches = verifiedSkillsMap.get(term);
        if (matches && matches.length > 0) {
          status = "confirmed_match";
          matchingBullets = Array.from(new Set(matches)).slice(0, 3);
          break;
        }
      }

      // If not confirmed match, check if mentioned in profile/entry descriptions without a quantified bullet
      // or if it represents a preferred/bonus requirement where evidence has not yet been recorded
      if (status === "genuine_gap") {
        const inEntryContext = bankEntries.some(
          (e) =>
            e.title.toLowerCase().includes(canonical) ||
            (e.descriptionContext && e.descriptionContext.toLowerCase().includes(canonical))
        );
        if (
          inEntryContext ||
          (kw as any).matchStatus === "missing" ||
          kw.priority === "nice_to_have" ||
          (kw as any).importance === "bonus"
        ) {
          status = "missing_evidence"; // Mentioned or preferred qualification lacking an evidenced achievement bullet
        }
      }

      const isMandatory =
        kw.priority === "must_have" ||
        (kw as any).importance === "critical" ||
        (kw as any).importance === "high";

      const reqText = `${(kw as any).term || kw.canonical}${kw.evidencePhrase ? ` (${kw.evidencePhrase})` : ""}`;

      const item: any = {
        id: kw.id,
        requirementText: reqText,
        text: reqText,
        kind: isMandatory ? "mandatory" : "preferred",
        status,
        matchingBullets,
        explanation:
          status === "confirmed_match"
            ? `Backed by ${matchingBullets.length} verified bullet(s) in your Data Bank.`
            : status === "missing_evidence"
            ? `Mentioned in your profile or context, but no quantified bullet demonstrates this skill.`
            : `Not found in your Data Bank records. Do not claim unless you have genuine experience.`,
      };

      if (isMandatory) {
        mandatoryRequirements.push(item);
      } else {
        preferredQualifications.push(item);
      }

      if (kw.category === "technical_skill" || kw.category === "tool" || (kw.category as string) === "hard_skill") {
        technicalCompetencies.push({ ...item, kind: "technical_skill" });
      }
    }

    // 3. Evaluate Responsibilities
    const responsibilities: EvaluatedRequirement[] = [];
    for (const resp of jdAnalysis.responsibilities || []) {
      const words = resp.text
        .toLowerCase()
        .split(/[\s,.;:()]+/)
        .filter((w) => w.length > 4);

      let matchedBullets: string[] = [];
      for (const w of words) {
        const list = verifiedSkillsMap.get(w);
        if (list) matchedBullets.push(...list);
      }

      matchedBullets = Array.from(new Set(matchedBullets));
      let status: EvidenceMatchStatus = "genuine_gap";
      if (matchedBullets.length >= 2) {
        status = "confirmed_match";
      } else if (matchedBullets.length === 1) {
        status = "partial_match";
      }

      responsibilities.push({
        id: resp.id,
        requirementText: resp.text,
        kind: "responsibility",
        status,
        matchingBullets: matchedBullets.slice(0, 3),
        explanation:
          status === "confirmed_match"
            ? "Your verified experience strongly aligns with this core responsibility."
            : status === "partial_match"
            ? "Partially aligned with existing work achievements."
            : "No recorded direct experience for this responsibility.",
      });
    }

    // 4. Implied requirements (Architectural, High Scale, Collaboration)
    const impliedExpectations: EvaluatedRequirement[] = [];
    const impliedKeywords = [
      { text: "Cross-functional Collaboration & Communication", check: ["collaborat", "cross-functional", "stakeholder", "partner"] },
      { text: "Production Reliability & System Observability", check: ["monitoring", "reliability", "metrics", "observability", "sentry", "datadog"] },
      { text: "Scalable Architecture & High Availability", check: ["scale", "distributed", "throughput", "latency", "pipeline"] },
    ];

    for (const imp of impliedKeywords) {
      let matched = false;
      const bulletsWithSkill: string[] = [];
      for (const term of imp.check) {
        const m = verifiedSkillsMap.get(term);
        if (m) {
          matched = true;
          bulletsWithSkill.push(...m);
        }
      }

      impliedExpectations.push({
        id: `imp_${imp.text.toLowerCase().replace(/\s+/g, "_")}`,
        requirementText: imp.text,
        kind: "implied",
        status: matched ? "confirmed_match" : "partial_match",
        matchingBullets: Array.from(new Set(bulletsWithSkill)).slice(0, 2),
        explanation: matched
          ? "Demonstrated in your achievement evidence."
          : "Implied technical expectation for modern software engineering roles.",
      });
    }

    // Summary calculations
    const allEvaluated = [
      ...mandatoryRequirements,
      ...preferredQualifications,
      ...responsibilities,
    ];
    const confirmedMatchesCount = allEvaluated.filter((e) => e.status === "confirmed_match").length;
    const partialMatchesCount = allEvaluated.filter((e) => e.status === "partial_match").length;
    const missingEvidenceCount = allEvaluated.filter((e) => e.status === "missing_evidence").length;
    const genuineGapsCount = allEvaluated.filter((e) => e.status === "genuine_gap").length;

    const matchReadinessPercent =
      allEvaluated.length > 0
        ? Math.round(
            ((confirmedMatchesCount * 1.0 + partialMatchesCount * 0.5) / allEvaluated.length) * 100
          )
        : 80;

    return {
      jobId: (jdAnalysis as any).jobId || "current-job",
      mandatoryRequirements,
      preferredQualifications,
      technicalCompetencies,
      responsibilities,
      impliedExpectations,
      summary: {
        confirmedMatchesCount,
        partialMatchesCount,
        missingEvidenceCount,
        genuineGapsCount,
        matchReadinessPercent,
      },
    };
  }
}
