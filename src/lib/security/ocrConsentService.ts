import { db } from "@/lib/db/client";
import { userOcrConsents } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

export const CURRENT_OCR_POLICY_VERSION = "2026-11-01";

export interface OcrConsentStatus {
  hasConsent: boolean;
  policyVersion?: string;
  consentedAt?: Date;
  isOutdated?: boolean;
  isRevoked?: boolean;
}

export class OcrConsentService {
  /**
   * Persistently records an authenticated user's consent bound to the active policy version
   */
  static async recordConsent(
    userId: string,
    policyVersion: string = CURRENT_OCR_POLICY_VERSION
  ): Promise<{ id: string; userId: string; policyVersion: string; consentedAt: Date }> {
    const id = `ocr_consent_${crypto.randomUUID()}`;
    const now = new Date();

    const [record] = await db
      .insert(userOcrConsents)
      .values({
        id,
        userId,
        policyVersion,
        consentedAt: now,
        revokedAt: null,
      })
      .onConflictDoUpdate({
        target: [userOcrConsents.userId],
        set: {
          policyVersion,
          consentedAt: now,
          revokedAt: null,
        },
      })
      .returning();

    return {
      id: record.id,
      userId: record.userId,
      policyVersion: record.policyVersion,
      consentedAt: record.consentedAt,
    };
  }

  /**
   * Revokes an existing OCR consent record for the authenticated user
   */
  static async revokeConsent(userId: string): Promise<void> {
    await db
      .update(userOcrConsents)
      .set({
        revokedAt: new Date(),
      })
      .where(eq(userOcrConsents.userId, userId));
  }

  /**
   * Checks whether the user has a valid, active, non-revoked consent for the specified policy version
   */
  static async hasValidConsent(
    userId: string,
    requiredPolicyVersion: string = CURRENT_OCR_POLICY_VERSION
  ): Promise<boolean> {
    const records = await db
      .select()
      .from(userOcrConsents)
      .where(
        and(
          eq(userOcrConsents.userId, userId),
          eq(userOcrConsents.policyVersion, requiredPolicyVersion),
          isNull(userOcrConsents.revokedAt)
        )
      )
      .limit(1);

    return records.length > 0;
  }

  /**
   * Retrieves full consent status and history metadata
   */
  static async getConsentStatus(userId: string): Promise<OcrConsentStatus> {
    const records = await db
      .select()
      .from(userOcrConsents)
      .where(eq(userOcrConsents.userId, userId))
      .limit(1);

    if (records.length === 0) {
      return { hasConsent: false };
    }

    const record = records[0];
    const isRevoked = Boolean(record.revokedAt);
    const isOutdated = record.policyVersion !== CURRENT_OCR_POLICY_VERSION;
    const hasConsent = !isRevoked && !isOutdated;

    return {
      hasConsent,
      policyVersion: record.policyVersion,
      consentedAt: record.consentedAt,
      isOutdated,
      isRevoked,
    };
  }
}
