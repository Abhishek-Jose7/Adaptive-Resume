import { AchievementBullet, BankEntry, StructuredFact } from "@/types/bank";
import { JDAnalysis } from "@/types/job";
import { RelevanceScorer, BulletRelevanceBreakdown } from "./relevanceScorer";

export interface RetrievedCandidate {
  bullet: AchievementBullet;
  parentEntry: BankEntry;
  facts: StructuredFact[];
  scoreBreakdown: BulletRelevanceBreakdown;
}

export interface RetrievalResult {
  candidates: RetrievedCandidate[];
  totalCandidateCount: number;
  estimatedTokens: number;
  tokenBudget: number;
  batchesNeeded: number;
}

export class BulletRetriever {
  private static readonly DEFAULT_TOKEN_BUDGET = 7000;
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Retrieves, scores, ranks, and budgets candidate bullets for a target JD
   * PRD Section 10.2 & 10.3
   */
  static retrieveCandidates(
    entries: BankEntry[],
    jdAnalysis: JDAnalysis,
    tokenBudget: number = this.DEFAULT_TOKEN_BUDGET
  ): RetrievalResult {
    const scoredList: RetrievedCandidate[] = [];

    for (const entry of entries) {
      if (!entry.bullets || entry.bullets.length === 0) continue;

      for (const bullet of entry.bullets) {
        // Exclusions handled inside RelevanceScorer (never_use / exclude_from_job)
        const scoreBreakdown = RelevanceScorer.scoreBullet(bullet, entry, jdAnalysis);
        if (scoreBreakdown.isExcluded) continue;

        scoredList.push({
          bullet,
          parentEntry: entry,
          facts: bullet.facts || [],
          scoreBreakdown,
        });
      }
    }

    // Sort descending by relevance score
    scoredList.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

    // Apply token budget
    // Include base prompt + JD requirement tokens estimation
    const jdTokens = Math.ceil(JSON.stringify(jdAnalysis).length / this.CHARS_PER_TOKEN);
    let currentTokens = jdTokens + 500; // 500 base instructions tokens
    const selected: RetrievedCandidate[] = [];

    for (const item of scoredList) {
      // Estimate token cost of this candidate item (bullet + facts + context)
      const itemChars =
        item.bullet.text.length +
        (item.parentEntry.title || "").length +
        (item.parentEntry.organization || "").length +
        (item.parentEntry.descriptionContext || "").length +
        item.facts.map((f) => f.valueText).join(" ").length;

      const itemTokens = Math.ceil(itemChars / this.CHARS_PER_TOKEN);

      if (currentTokens + itemTokens <= tokenBudget || selected.length < 3) {
        selected.push(item);
        currentTokens += itemTokens;
      } else {
        // If we reach budget, stop adding to primary batch
        break;
      }
    }

    const batchesNeeded = Math.max(1, Math.ceil(scoredList.length / Math.max(1, selected.length)));

    return {
      candidates: selected,
      totalCandidateCount: scoredList.length,
      estimatedTokens: currentTokens,
      tokenBudget,
      batchesNeeded,
    };
  }
}
