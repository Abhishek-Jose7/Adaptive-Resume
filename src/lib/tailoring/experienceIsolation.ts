import { BankEntry, AchievementBullet, BulletFact } from "@/types/bank";

export interface IsolationAuditResult {
  isIsolated: boolean;
  leakedEntities: string[];
  leakedMetrics: string[];
  violationMessage?: string;
}

export class ExperienceIsolationEngine {
  /**
   * Filters the available candidate evidence so that only facts, keywords, and metrics
   * belonging strictly to the targeted entry (and explicitly global profile skills) are permitted.
   */
  static getPermittedEvidence(
    targetEntryId: string,
    allEntries: BankEntry[],
    allBullets: AchievementBullet[],
    allFacts: BulletFact[]
  ): {
    targetEntry: BankEntry | undefined;
    targetBullets: AchievementBullet[];
    permittedFacts: BulletFact[];
    forbiddenEntityVocabulary: Set<string>;
  } {
    const targetEntry = allEntries.find((e) => e.id === targetEntryId);
    const targetBullets = allBullets.filter((b) => b.entryId === targetEntryId);
    const targetBulletIds = new Set(targetBullets.map((b) => b.id));

    // Permitted facts: only facts attached directly to the target entry or its bullets
    const permittedFacts = allFacts.filter(
      (f) =>
        f.entryId === targetEntryId ||
        (f.bulletId && targetBulletIds.has(f.bulletId))
    );

    // Forbidden vocabulary: tools, tech, company names, and metrics that belong EXCLUSIVELY
    // to other entries, to prevent cross-project contamination
    const forbiddenEntityVocabulary = new Set<string>();

    const targetWords = new Set<string>();
    if (targetEntry) {
      if (targetEntry.title) targetEntry.title.toLowerCase().split(/\s+/).forEach((w) => targetWords.add(w));
      if (targetEntry.organization) targetEntry.organization.toLowerCase().split(/\s+/).forEach((w) => targetWords.add(w));
      if (targetEntry.descriptionContext) targetEntry.descriptionContext.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => targetWords.add(w));
    }
    targetBullets.forEach((b) => {
      b.text.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => targetWords.add(w));
    });
    permittedFacts.forEach((f) => {
      f.valueText.toLowerCase().split(/[\s,.;:()]+/).forEach((w) => targetWords.add(w));
    });

    for (const otherEntry of allEntries) {
      if (otherEntry.id === targetEntryId) continue;

      // Collect specific proper nouns/tech from other entries that are NOT in target entry
      if (otherEntry.organization) {
        const org = otherEntry.organization.toLowerCase().trim();
        if (org.length > 2 && !targetWords.has(org)) {
          forbiddenEntityVocabulary.add(org);
        }
      }

      // Bullets belonging to other entries
      const otherBullets = allBullets.filter((b) => b.entryId === otherEntry.id);
      for (const ob of otherBullets) {
        // Collect facts from other bullets
        const otherFacts = allFacts.filter((f) => f.bulletId === ob.id);
        for (const ofact of otherFacts) {
          if (ofact.factType === "tool" || ofact.factType === "technology" || ofact.factType === "metric") {
            const val = ofact.valueText.toLowerCase().trim();
            if (val.length > 2 && !targetWords.has(val)) {
              forbiddenEntityVocabulary.add(val);
            }
          }
        }
      }
    }

    return {
      targetEntry,
      targetBullets,
      permittedFacts,
      forbiddenEntityVocabulary,
    };
  }

  /**
   * Verifies that a rewritten or generated bullet does not contain facts,
   * organizations, or unique technologies leaked from an unrelated experience.
   */
  static auditIsolation(
    rewrittenText: string,
    targetEntryId: string,
    allEntries: BankEntry[],
    allBullets: AchievementBullet[],
    allFacts: BulletFact[]
  ): IsolationAuditResult {
    const { forbiddenEntityVocabulary } = this.getPermittedEvidence(
      targetEntryId,
      allEntries,
      allBullets,
      allFacts
    );

    const lowerText = rewrittenText.toLowerCase();
    const leakedEntities: string[] = [];

    for (const forbidden of forbiddenEntityVocabulary) {
      // Word boundary match
      const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(lowerText)) {
        leakedEntities.push(forbidden);
      }
    }

    if (leakedEntities.length > 0) {
      return {
        isIsolated: false,
        leakedEntities,
        leakedMetrics: [],
        violationMessage: `Experience Isolation Failure: Rewritten bullet contains context (${leakedEntities.join(
          ", "
        )}) belonging to an unrelated work experience or project.`,
      };
    }

    return {
      isIsolated: true,
      leakedEntities: [],
      leakedMetrics: [],
    };
  }
}
