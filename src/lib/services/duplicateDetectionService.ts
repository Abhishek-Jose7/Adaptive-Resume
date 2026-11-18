import { BankEntry } from "../../types/bank";

export interface DuplicateEntryCandidate {
  primaryId: string;
  duplicateId: string;
  reason: string;
  similarityScore: number;
}

export interface DuplicateBulletCandidate {
  primaryBulletId: string;
  duplicateBulletId: string;
  primaryText: string;
  duplicateText: string;
  reason: string;
  similarityScore: number;
}

export class DuplicateDetectionService {
  /**
   * Jaccard similarity index on character bigrams / word tokens
   */
  private static calculateSimilarity(a: string, b: string): number {
    const tokenize = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter(Boolean)
      );

    const setA = tokenize(a);
    const setB = tokenize(b);

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersectionCount = 0;
    for (const token of setA) {
      if (setB.has(token)) intersectionCount++;
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }

  static findDuplicates(entries: BankEntry[]): {
    duplicateEntries: DuplicateEntryCandidate[];
    duplicateBullets: DuplicateBulletCandidate[];
  } {
    const duplicateEntries: DuplicateEntryCandidate[] = [];
    const duplicateBullets: DuplicateBulletCandidate[] = [];

    // 1. Entry level duplicate detection
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const e1 = entries[i];
        const e2 = entries[j];

        if (e1.entryType === e2.entryType) {
          const sameTitle =
            e1.title.trim().toLowerCase() === e2.title.trim().toLowerCase();
          const sameOrg =
            e1.organization &&
            e2.organization &&
            e1.organization.trim().toLowerCase() === e2.organization.trim().toLowerCase();

          if (sameTitle && sameOrg) {
            duplicateEntries.push({
              primaryId: e1.id,
              duplicateId: e2.id,
              reason: `Identical organization (${e1.organization}) and title (${e1.title})`,
              similarityScore: 1.0,
            });
          }
        }
      }
    }

    // 2. Bullet level duplicate detection across entries
    const allBullets: Array<{ id: string; text: string; entryId: string }> = [];
    for (const e of entries) {
      if (e.bullets) {
        for (const b of e.bullets) {
          allBullets.push({ id: b.id, text: b.text, entryId: e.id });
        }
      }
    }

    for (let i = 0; i < allBullets.length; i++) {
      for (let j = i + 1; j < allBullets.length; j++) {
        const b1 = allBullets[i];
        const b2 = allBullets[j];

        const similarity = this.calculateSimilarity(b1.text, b2.text);
        if (similarity >= 0.8) {
          duplicateBullets.push({
            primaryBulletId: b1.id,
            duplicateBulletId: b2.id,
            primaryText: b1.text,
            duplicateText: b2.text,
            reason: `Near-identical achievement bullet content (${Math.round(similarity * 100)}% match)`,
            similarityScore: similarity,
          });
        }
      }
    }

    return { duplicateEntries, duplicateBullets };
  }
}
