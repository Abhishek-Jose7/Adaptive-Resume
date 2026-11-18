import { AchievementBullet, BulletFact } from "@/types/bank";
import { diffWordsWithSpace } from "diff";

export interface ClaimMapItem {
  claim: string;
  evidenceIds: string[];
  claimType: "action" | "metric" | "tool" | "outcome" | "scope";
}

export interface ProvenanceTraceRecord {
  bulletId: string;
  originalText: string;
  rewrittenText: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  claimMap: ClaimMapItem[];
  diffParts: Array<{ value: string; added?: boolean; removed?: boolean }>;
  approvalStatus: "pending" | "approved" | "rejected";
  validationNotes?: string[];
}

export class ProvenanceService {
  /**
   * Builds an explicit visual diff and traceability record between source and rewritten bullets
   */
  static buildTraceRecord(
    bulletId: string,
    originalText: string,
    rewrittenText: string,
    sourceBullets: AchievementBullet[],
    sourceFacts: BulletFact[],
    claimMap: ClaimMapItem[] = [],
    approvalStatus: "pending" | "approved" | "rejected" = "pending"
  ): ProvenanceTraceRecord {
    // Generate word-level diff
    const diff = diffWordsWithSpace(originalText, rewrittenText);
    const diffParts = diff.map((part) => ({
      value: part.value,
      added: part.added,
      removed: part.removed,
    }));

    return {
      bulletId,
      originalText,
      rewrittenText,
      sourceBulletIds: sourceBullets.map((b) => b.id),
      sourceFactIds: sourceFacts.map((f) => f.id),
      claimMap,
      diffParts,
      approvalStatus,
    };
  }

  /**
   * Audits that every claim in the claimMap has valid evidence in the provided source facts/bullets
   */
  static verifyTraceability(
    claimMap: ClaimMapItem[],
    availableEvidenceIds: Set<string>
  ): { isValid: boolean; unsupportedClaims: string[] } {
    const unsupportedClaims: string[] = [];

    for (const item of claimMap) {
      if (!item.evidenceIds || item.evidenceIds.length === 0) {
        unsupportedClaims.push(item.claim);
        continue;
      }

      const hasValidEvidence = item.evidenceIds.some((id) => availableEvidenceIds.has(id));
      if (!hasValidEvidence) {
        unsupportedClaims.push(item.claim);
      }
    }

    return {
      isValid: unsupportedClaims.length === 0,
      unsupportedClaims,
    };
  }
}
