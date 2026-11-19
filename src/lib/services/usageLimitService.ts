import { db } from "@/lib/db/client";
import { userUsageQuotas, bankEntries, resumeDocuments, providerCredentials } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

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
   * Atomically checks and reserves an AI generation slot in a single database statement.
   * If the user has a custom BYOK key, generations are unlimited on our platform.
   * If on free-tier, performs an atomic conditional UPSERT with `ai_generations_count < 50`.
   * Returns `{ reserved: true }` if successfully reserved, or `{ reserved: false }` if quota is exhausted.
   */
  static async checkAndReserveAiGeneration(
    userId: string
  ): Promise<{ reserved: boolean; isByok: boolean; currentCount: number }> {
    // 1. Check for custom BYOK credentials
    const creds = await db
      .select({ id: providerCredentials.id })
      .from(providerCredentials)
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.isValid, true)))
      .limit(1);

    if (creds.length > 0) {
      return { reserved: true, isByok: true, currentCount: 0 };
    }

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const nowIso = new Date().toISOString();
    const id = `quota_${userId}_${currentPeriod}`;
    const limit = this.FREE_LIMITS.maxAiGenerationsPerMonth;

    const rows = await db.execute<{ ai_generations_count: number }>(sql`
      INSERT INTO user_usage_quotas (id, user_id, monthly_period, ai_generations_count, ai_tokens_consumed, exports_generated_count, active_resumes_count, updated_at)
      VALUES (${id}, ${userId}, ${currentPeriod}, 1, 0, 0, 0, ${nowIso})
      ON CONFLICT (user_id, monthly_period)
      DO UPDATE SET
        ai_generations_count = user_usage_quotas.ai_generations_count + 1,
        updated_at = ${nowIso}
      WHERE user_usage_quotas.ai_generations_count < ${limit}
      RETURNING ai_generations_count;
    `);

    if (!rows || rows.length === 0) {
      return { reserved: false, isByok: false, currentCount: limit };
    }

    return {
      reserved: true,
      isByok: false,
      currentCount: Number(rows[0].ai_generations_count),
    };
  }

  /**
   * Atomically refunds an AI generation slot if generation failed or threw an error downstream
   */
  static async refundAiGeneration(userId: string): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const nowIso = new Date().toISOString();

    await db.execute(sql`
      UPDATE user_usage_quotas
      SET ai_generations_count = GREATEST(0, ai_generations_count - 1),
          updated_at = ${nowIso}
      WHERE user_id = ${userId} AND monthly_period = ${currentPeriod};
    `);
  }

  /**
   * Records token usage for an already-reserved generation run without double-counting generation count
   */
  static async recordAiTokens(userId: string, tokensConsumed: number): Promise<void> {
    if (tokensConsumed <= 0) return;
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const nowIso = new Date().toISOString();

    await db.execute(sql`
      UPDATE user_usage_quotas
      SET ai_tokens_consumed = ai_tokens_consumed + ${tokensConsumed},
          updated_at = ${nowIso}
      WHERE user_id = ${userId} AND monthly_period = ${currentPeriod};
    `);
  }

  /**
   * Atomically checks and consumes an export quota slot in a single database statement.
   * Performs an atomic conditional UPSERT with `exports_generated_count < 20`.
   * Returns `{ allowed: true }` if successfully consumed, or `{ allowed: false }` if quota is exhausted.
   */
  static async checkAndConsumeExportQuota(
    userId: string
  ): Promise<{ allowed: boolean; currentCount: number }> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const nowIso = new Date().toISOString();
    const id = `quota_${userId}_${currentPeriod}`;
    const limit = this.FREE_LIMITS.maxExportsPerMonth;

    const rows = await db.execute<{ exports_generated_count: number }>(sql`
      INSERT INTO user_usage_quotas (id, user_id, monthly_period, ai_generations_count, ai_tokens_consumed, exports_generated_count, active_resumes_count, updated_at)
      VALUES (${id}, ${userId}, ${currentPeriod}, 0, 0, 1, 0, ${nowIso})
      ON CONFLICT (user_id, monthly_period)
      DO UPDATE SET
        exports_generated_count = user_usage_quotas.exports_generated_count + 1,
        updated_at = ${nowIso}
      WHERE user_usage_quotas.exports_generated_count < ${limit}
      RETURNING exports_generated_count;
    `);

    if (!rows || rows.length === 0) {
      return { allowed: false, currentCount: limit };
    }

    return {
      allowed: true,
      currentCount: Number(rows[0].exports_generated_count),
    };
  }

  /**
   * Atomically refunds an export quota slot if export serialization or file rendering failed
   */
  static async refundExportQuota(userId: string): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const nowIso = new Date().toISOString();

    await db.execute(sql`
      UPDATE user_usage_quotas
      SET exports_generated_count = GREATEST(0, exports_generated_count - 1),
          updated_at = ${nowIso}
      WHERE user_id = ${userId} AND monthly_period = ${currentPeriod};
    `);
  }

  /**
   * Atomically increments generation count and token usage in a single statement.
   * Kept for backwards compatibility.
   */
  static async recordAiGeneration(
    userId: string,
    tokensConsumed: number = 0
  ): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const now = new Date();
    const id = `quota_${userId}_${currentPeriod}`;

    await db
      .insert(userUsageQuotas)
      .values({
        id,
        userId,
        monthlyPeriod: currentPeriod,
        aiGenerationsCount: 1,
        aiTokensConsumed: tokensConsumed,
        exportsGeneratedCount: 0,
        activeResumesCount: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userUsageQuotas.userId, userUsageQuotas.monthlyPeriod],
        set: {
          aiGenerationsCount: sql`${userUsageQuotas.aiGenerationsCount} + 1`,
          aiTokensConsumed: sql`${userUsageQuotas.aiTokensConsumed} + ${tokensConsumed}`,
          updatedAt: now,
        },
      });
  }

  /**
   * Atomically increments export count in a single statement.
   * Kept for backwards compatibility.
   */
  static async recordExport(userId: string, _format?: string): Promise<void> {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const now = new Date();
    const id = `quota_${userId}_${currentPeriod}`;

    await db
      .insert(userUsageQuotas)
      .values({
        id,
        userId,
        monthlyPeriod: currentPeriod,
        aiGenerationsCount: 0,
        aiTokensConsumed: 0,
        exportsGeneratedCount: 1,
        activeResumesCount: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userUsageQuotas.userId, userUsageQuotas.monthlyPeriod],
        set: {
          exportsGeneratedCount: sql`${userUsageQuotas.exportsGeneratedCount} + 1`,
          updatedAt: now,
        },
      });
  }
}
