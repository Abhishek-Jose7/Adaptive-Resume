import { db } from "@/lib/db/client";
import { userUsageQuotas, bankEntries, resumeDocuments, providerCredentials } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface FreeTierUsageReport {
  monthlyPeriod: string;
  hasCustomApiKey: boolean;
  activeProvider: string;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  aiTokensConsumed: number;
  exportsUsed: number;
  exportsLimit: number;
  storageEntriesUsed: number;
  storageEntriesLimit: number;
  resumesCount: number;
  resumesLimit: number;
  isAiQuotaExhausted: boolean;
  isExportQuotaExhausted: boolean;
  honestNotice: string;
}

export class UsageLimitService {
  private static readonly FREE_LIMITS = {
    maxAiGenerationsPerMonth: 50,
    maxExportsPerMonth: 20,
    maxStorageEntries: 500,
    maxActiveResumes: 25,
  };

  /**
   * Retrieves an honest, comprehensive usage report before the user initiates any operation
   */
  static async getUsageReport(userId: string): Promise<FreeTierUsageReport> {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Check BYOK keys
    const creds = await db
      .select()
      .from(providerCredentials)
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.isValid, true)));

    const hasCustomApiKey = creds.length > 0;
    const activeProvider = hasCustomApiKey ? creds[0].provider : "Local / Shared Free Tier";

    // Fetch quota record
    let [usage] = await db
      .select()
      .from(userUsageQuotas)
      .where(
        and(
          eq(userUsageQuotas.userId, userId),
          eq(userUsageQuotas.monthlyPeriod, currentPeriod)
        )
      );

    if (!usage) {
      const id = `quota_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db
        .insert(userUsageQuotas)
        .values({
          id,
          userId,
          monthlyPeriod: currentPeriod,
          aiTokensConsumed: 0,
          aiGenerationsCount: 0,
          exportsGeneratedCount: 0,
          activeResumesCount: 0,
        })
        .onConflictDoNothing();

      [usage] = await db
        .select()
        .from(userUsageQuotas)
        .where(
          and(
            eq(userUsageQuotas.userId, userId),
            eq(userUsageQuotas.monthlyPeriod, currentPeriod)
          )
        );
    }

    // Live counts
    const entries = await db
      .select({ id: bankEntries.id })
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt)));

    const resumes = await db
      .select({ id: resumeDocuments.id })
      .from(resumeDocuments)
      .where(eq(resumeDocuments.userId, userId));

    const aiUsed = usage?.aiGenerationsCount || 0;
    const expUsed = usage?.exportsGeneratedCount || 0;

    // If user has supplied BYOK, generation limits are unlimited on our platform (governed by their provider)
    const effectiveAiLimit = hasCustomApiKey ? Infinity : this.FREE_LIMITS.maxAiGenerationsPerMonth;
    const effectiveExpLimit = this.FREE_LIMITS.maxExportsPerMonth;

    return {
      monthlyPeriod: currentPeriod,
      hasCustomApiKey,
      activeProvider,
      aiGenerationsUsed: aiUsed,
      aiGenerationsLimit: hasCustomApiKey ? 9999 : effectiveAiLimit,
      aiTokensConsumed: usage?.aiTokensConsumed || 0,
      exportsUsed: expUsed,
      exportsLimit: effectiveExpLimit,
      storageEntriesUsed: entries.length,
      storageEntriesLimit: this.FREE_LIMITS.maxStorageEntries,
      resumesCount: resumes.length,
      resumesLimit: this.FREE_LIMITS.maxActiveResumes,
      isAiQuotaExhausted: !hasCustomApiKey && aiUsed >= effectiveAiLimit,
      isExportQuotaExhausted: expUsed >= effectiveExpLimit,
      honestNotice: hasCustomApiKey
        ? `You have connected your own ${activeProvider} key. Platform generation rate limits are bypassed.`
        : `Free-tier mode: ${effectiveAiLimit - aiUsed} free AI generations remaining this month. Add a free Google Gemini or Groq key in Settings anytime for unlimited usage.`,
    };
  }

  /**
   * Increments generation count and token usage
   */
  static async recordAiGeneration(
    userId: string,
    tokensConsumed: number = 0
  ): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const existing = await db
      .select()
      .from(userUsageQuotas)
      .where(
        and(
          eq(userUsageQuotas.userId, userId),
          eq(userUsageQuotas.monthlyPeriod, currentPeriod)
        )
      );

    const now = new Date();
    if (existing.length > 0) {
      await db
        .update(userUsageQuotas)
        .set({
          aiGenerationsCount: existing[0].aiGenerationsCount + 1,
          aiTokensConsumed: existing[0].aiTokensConsumed + tokensConsumed,
          updatedAt: now,
        })
        .where(eq(userUsageQuotas.id, existing[0].id));
    } else {
      const id = `quota_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(userUsageQuotas).values({
        id,
        userId,
        monthlyPeriod: currentPeriod,
        aiGenerationsCount: 1,
        aiTokensConsumed: tokensConsumed,
        exportsGeneratedCount: 0,
        activeResumesCount: 0,
        updatedAt: now,
      });
    }
  }

  /**
   * Increments export count
   */
  static async recordExport(userId: string, _format?: string): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const existing = await db
      .select()
      .from(userUsageQuotas)
      .where(
        and(
          eq(userUsageQuotas.userId, userId),
          eq(userUsageQuotas.monthlyPeriod, currentPeriod)
        )
      );

    const now = new Date();
    if (existing.length > 0) {
      await db
        .update(userUsageQuotas)
        .set({
          exportsGeneratedCount: existing[0].exportsGeneratedCount + 1,
          updatedAt: now,
        })
        .where(eq(userUsageQuotas.id, existing[0].id));
    } else {
      const id = `quota_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(userUsageQuotas).values({
        id,
        userId,
        monthlyPeriod: currentPeriod,
        aiTokensConsumed: 0,
        aiGenerationsCount: 0,
        exportsGeneratedCount: 1,
        activeResumesCount: 0,
        updatedAt: now,
      });
    }
  }
}
