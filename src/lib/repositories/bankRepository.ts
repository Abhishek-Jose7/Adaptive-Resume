import { db } from "../db/client";
import {
  bankEntries,
  achievementBullets,
  bulletFacts,
} from "../db/schema";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { assertValidUserId, tenantActiveFilter, tenantFilter } from "../db/tenant";
import { BankEntry, AchievementBullet, BulletFact, EntryType } from "../../types/bank";
import { safePostgresDate } from "../utils/dateUtils";

export interface BankListOptions {
  entryType?: EntryType;
  cursor?: { updatedAt: Date | string; id: string };
  limit?: number;
  searchQuery?: string;
}

export class BankRepository {
  /**
   * List entries with cursor pagination and optional full-text search.
   * Avoids N+1 queries by fetching entries first, then batching bullets and facts in 2 round-trips.
   * Section 7.10 query performance budget: p95 <= 150ms.
   */
  static async listEntries(
    userId: string,
    options: BankListOptions = {}
  ): Promise<{ items: BankEntry[]; nextCursor?: { updatedAt: string; id: string } }> {
    assertValidUserId(userId);
    const limit = Math.min(options.limit || 25, 100);

    const conditions = [
      eq(bankEntries.userId, userId),
      isNull(bankEntries.deletedAt),
    ];

    if (options.entryType) {
      conditions.push(eq(bankEntries.entryType, options.entryType));
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const terms = options.searchQuery
        .trim()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9_+#-]/gi, ""))
        .filter(Boolean);
      if (terms.length > 0) {
        const formattedQuery = terms.map((term) => `${term}:*`).join(" & ");
        conditions.push(
          sql`${bankEntries.searchVector} @@ to_tsquery('english', ${formattedQuery})`
        );
      }
    }

    if (options.cursor) {
      const cursorDate = new Date(options.cursor.updatedAt);
      conditions.push(
        or(
          lt(bankEntries.updatedAt, cursorDate),
          and(eq(bankEntries.updatedAt, cursorDate), lt(bankEntries.id, options.cursor.id))
        )!
      );
    }

    // 1. Fetch entries page (1 bounded query)
    const rawEntries = await db
      .select()
      .from(bankEntries)
      .where(and(...conditions))
      .orderBy(desc(bankEntries.updatedAt), desc(bankEntries.id))
      .limit(limit + 1);

    const hasMore = rawEntries.length > limit;
    const entriesPage = hasMore ? rawEntries.slice(0, limit) : rawEntries;

    if (entriesPage.length === 0) {
      return { items: [] };
    }

    const entryIds = entriesPage.map((e) => e.id);

    // 2. Batched fetch for all bullets belonging to these entries (1 query)
    const rawBullets = await db
      .select()
      .from(achievementBullets)
      .where(
        and(
          eq(achievementBullets.userId, userId),
          inArray(achievementBullets.entryId, entryIds),
          isNull(achievementBullets.deletedAt)
        )
      )
      .orderBy(achievementBullets.sortOrder, achievementBullets.id);

    const bulletIds = rawBullets.map((b) => b.id);

    // 3. Batched fetch for all facts belonging to either these bullets or entries (1 query)
    const rawFacts = bulletIds.length > 0 || entryIds.length > 0
      ? await db
          .select()
          .from(bulletFacts)
          .where(
            and(
              eq(bulletFacts.userId, userId),
              or(
                bulletIds.length > 0 ? inArray(bulletFacts.bulletId, bulletIds) : sql`false`,
                entryIds.length > 0 ? inArray(bulletFacts.entryId, entryIds) : sql`false`
              )
            )
          )
      : [];

    // Group facts by bulletId and entryId in memory (zero extra database round-trips)
    const factsByBulletId = new Map<string, BulletFact[]>();
    const factsByEntryId = new Map<string, BulletFact[]>();

    for (const f of rawFacts) {
      const fact: BulletFact = {
        id: f.id,
        userId: f.userId,
        bulletId: f.bulletId,
        entryId: f.entryId,
        factType: f.factType as any,
        factKey: f.factKey,
        valueText: f.valueText,
        valueNumber: f.valueNumber,
        unit: f.unit,
        currencyCode: f.currencyCode,
        metricKind: f.metricKind as any,
        sourceEvidenceId: f.sourceEvidenceId,
        verificationStatus: f.verificationStatus as any,
        createdAt: f.createdAt,
      };

      if (f.bulletId) {
        if (!factsByBulletId.has(f.bulletId)) factsByBulletId.set(f.bulletId, []);
        factsByBulletId.get(f.bulletId)!.push(fact);
      }
      if (f.entryId) {
        if (!factsByEntryId.has(f.entryId)) factsByEntryId.set(f.entryId, []);
        factsByEntryId.get(f.entryId)!.push(fact);
      }
    }

    // Group bullets by entryId
    const bulletsByEntryId = new Map<string, AchievementBullet[]>();
    for (const b of rawBullets) {
      const bullet: AchievementBullet = {
        id: b.id,
        userId: b.userId,
        entryId: b.entryId,
        text: b.text,
        normalizedText: b.normalizedText,
        visibility: b.visibility as any,
        verificationStatus: b.verificationStatus as any,
        usagePolicy: b.usagePolicy as any,
        sortOrder: b.sortOrder,
        rowVersion: b.rowVersion,
        sourceId: b.sourceId,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        deletedAt: b.deletedAt,
        facts: factsByBulletId.get(b.id) || [],
      };

      if (!bulletsByEntryId.has(b.entryId)) bulletsByEntryId.set(b.entryId, []);
      bulletsByEntryId.get(b.entryId)!.push(bullet);
    }

    // Assemble final structured entries
    const items: BankEntry[] = entriesPage.map((e) => ({
      id: e.id,
      userId: e.userId,
      entryType: e.entryType as any,
      title: e.title,
      organization: e.organization,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      descriptionContext: e.descriptionContext,
      visibility: e.visibility as any,
      verificationStatus: e.verificationStatus as any,
      sortOrder: e.sortOrder,
      rowVersion: e.rowVersion,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt,
      bullets: bulletsByEntryId.get(e.id) || [],
      facts: factsByEntryId.get(e.id) || [],
    }));

    let nextCursor: { updatedAt: string; id: string } | undefined;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = {
        updatedAt: new Date(lastItem.updatedAt).toISOString(),
        id: lastItem.id,
      };
    }

    return { items, nextCursor };
  }

  /**
   * Get single entry by ID with its bullets and facts
   */
  static async getEntryById(userId: string, entryId: string): Promise<BankEntry | null> {
    assertValidUserId(userId);

    const [entry] = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, userId), eq(bankEntries.id, entryId), isNull(bankEntries.deletedAt)))
      .limit(1);

    if (!entry) return null;

    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.entryId, entryId), isNull(achievementBullets.deletedAt)))
      .orderBy(achievementBullets.sortOrder);

    const bulletIds = bullets.map((b) => b.id);

    const rawFacts = await db
      .select()
      .from(bulletFacts)
      .where(
        and(
          eq(bulletFacts.userId, userId),
          or(
            bulletIds.length > 0 ? inArray(bulletFacts.bulletId, bulletIds) : sql`false`,
            eq(bulletFacts.entryId, entryId)
          )
        )
      );

    const factsByBulletId = new Map<string, BulletFact[]>();
    const entryFacts: BulletFact[] = [];

    for (const f of rawFacts) {
      const fact: BulletFact = {
        id: f.id,
        userId: f.userId,
        bulletId: f.bulletId,
        entryId: f.entryId,
        factType: f.factType as any,
        factKey: f.factKey,
        valueText: f.valueText,
        valueNumber: f.valueNumber,
        unit: f.unit,
        currencyCode: f.currencyCode,
        metricKind: f.metricKind as any,
        sourceEvidenceId: f.sourceEvidenceId,
        verificationStatus: f.verificationStatus as any,
        createdAt: f.createdAt,
      };
      if (f.bulletId) {
        if (!factsByBulletId.has(f.bulletId)) factsByBulletId.set(f.bulletId, []);
        factsByBulletId.get(f.bulletId)!.push(fact);
      } else {
        entryFacts.push(fact);
      }
    }

    return {
      id: entry.id,
      userId: entry.userId,
      entryType: entry.entryType as any,
      title: entry.title,
      organization: entry.organization,
      location: entry.location,
      startDate: entry.startDate,
      endDate: entry.endDate,
      isCurrent: entry.isCurrent,
      descriptionContext: entry.descriptionContext,
      visibility: entry.visibility as any,
      verificationStatus: entry.verificationStatus as any,
      sortOrder: entry.sortOrder,
      rowVersion: entry.rowVersion,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
      bullets: bullets.map((b) => ({
        id: b.id,
        userId: b.userId,
        entryId: b.entryId,
        text: b.text,
        normalizedText: b.normalizedText,
        visibility: b.visibility as any,
        verificationStatus: b.verificationStatus as any,
        usagePolicy: b.usagePolicy as any,
        sortOrder: b.sortOrder,
        rowVersion: b.rowVersion,
        sourceId: b.sourceId,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        deletedAt: b.deletedAt,
        facts: factsByBulletId.get(b.id) || [],
      })),
      facts: entryFacts,
    };
  }

  /**
   * Create a new Bank Entry
   */
  static async createEntry(
    userId: string,
    data: {
      entryType: EntryType;
      title: string;
      organization?: string | null;
      location?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      isCurrent?: boolean;
      descriptionContext?: string | null;
      visibility?: string;
      verificationStatus?: string;
      sortOrder?: number;
    }
  ): Promise<string> {
    assertValidUserId(userId);
    const id = `entry_${crypto.randomUUID()}`;

    const isCurrent = Boolean(
      data.isCurrent ||
      (data.endDate && /^(present|current|now|ongoing)$/i.test(data.endDate.trim()))
    );

    await db.insert(bankEntries).values({
      id,
      userId,
      entryType: data.entryType,
      title: data.title,
      organization: data.organization || null,
      location: data.location || null,
      startDate: safePostgresDate(data.startDate, false),
      endDate: isCurrent ? null : safePostgresDate(data.endDate, true),
      isCurrent,
      descriptionContext: data.descriptionContext || null,
      visibility: data.visibility || "private",
      verificationStatus: data.verificationStatus || "unverified",
      sortOrder: data.sortOrder || 0,
      rowVersion: 1,
    });

    return id;
  }

  /**
   * Update entry with optimistic concurrency check
   */
  static async updateEntry(
    userId: string,
    entryId: string,
    expectedRowVersion: number,
    data: Partial<{
      title: string;
      organization: string | null;
      location: string | null;
      startDate: string | null;
      endDate: string | null;
      isCurrent: boolean;
      descriptionContext: string | null;
      visibility: string;
      verificationStatus: string;
      sortOrder: number;
    }>
  ): Promise<boolean> {
    assertValidUserId(userId);

    const updatePayload: Record<string, any> = { ...data };
    if ("startDate" in data) {
      updatePayload.startDate = safePostgresDate(data.startDate, false);
    }
    if ("endDate" in data) {
      const isCurr = Boolean(data.isCurrent || (data.endDate && /^(present|current|now|ongoing)$/i.test(data.endDate.trim())));
      updatePayload.endDate = isCurr ? null : safePostgresDate(data.endDate, true);
      if (data.isCurrent === undefined && isCurr) {
        updatePayload.isCurrent = true;
      }
    }

    const result = await db
      .update(bankEntries)
      .set({
        ...updatePayload,
        rowVersion: expectedRowVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankEntries.userId, userId),
          eq(bankEntries.id, entryId),
          eq(bankEntries.rowVersion, expectedRowVersion),
          isNull(bankEntries.deletedAt)
        )
      )
      .returning({ id: bankEntries.id });

    return result.length > 0;
  }

  /**
   * Soft-delete entry with undo support (PRD Section 6.2 B4)
   */
  static async softDeleteEntry(userId: string, entryId: string): Promise<void> {
    assertValidUserId(userId);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(bankEntries)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(bankEntries.userId, userId), eq(bankEntries.id, entryId)));

      await tx
        .update(achievementBullets)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.entryId, entryId)));
    });
  }

  /**
   * Restore soft-deleted entry (Undo)
   */
  static async restoreEntry(userId: string, entryId: string): Promise<void> {
    assertValidUserId(userId);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(bankEntries)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(bankEntries.userId, userId), eq(bankEntries.id, entryId)));

      await tx
        .update(achievementBullets)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.entryId, entryId)));
    });
  }

  /**
   * Add atomic bullet to entry
   */
  static async createBullet(
    userId: string,
    entryId: string,
    data: {
      text: string;
      normalizedText?: string;
      visibility?: string;
      verificationStatus?: string;
      usagePolicy?: string;
      sortOrder?: number;
      facts?: Array<{
        factType: string;
        factKey: string;
        valueText: string;
        valueNumber?: number | null;
        unit?: string | null;
        currencyCode?: string | null;
        metricKind?: string | null;
      }>;
    }
  ): Promise<string> {
    assertValidUserId(userId);
    const bulletId = `bullet_${crypto.randomUUID()}`;

      const currentBullets = await db
        .select({ sortOrder: achievementBullets.sortOrder })
        .from(achievementBullets)
        .where(
          and(
            eq(achievementBullets.userId, userId),
            eq(achievementBullets.entryId, entryId),
            isNull(achievementBullets.deletedAt)
          )
        );
      const nextSortOrder =
        data.sortOrder !== undefined
          ? data.sortOrder
          : currentBullets.reduce((max, b) => Math.max(max, b.sortOrder ?? 0), -1) + 1;

    await db.transaction(async (tx) => {
      await tx.insert(achievementBullets).values({
        id: bulletId,
        userId,
        entryId,
        text: data.text,
        normalizedText: data.normalizedText || data.text.trim().toLowerCase(),
        visibility: data.visibility || "private",
        verificationStatus: data.verificationStatus || "unverified",
        usagePolicy: data.usagePolicy || "eligible",
        sortOrder: nextSortOrder,
        rowVersion: 1,
      });

      if (data.facts && data.facts.length > 0) {
        await tx.insert(bulletFacts).values(
          data.facts.map((f) => ({
            id: `fact_${crypto.randomUUID()}`,
            userId,
            bulletId,
            factType: f.factType,
            factKey: f.factKey,
            valueText: f.valueText,
            valueNumber: f.valueNumber ?? null,
            unit: f.unit ?? null,
            currencyCode: f.currencyCode ?? null,
            metricKind: f.metricKind ?? null,
            verificationStatus: "unverified",
          }))
        );
      }
    });

    return bulletId;
  }

  /**
   * Update bullet with optimistic concurrency
   */
  static async updateBullet(
    userId: string,
    bulletId: string,
    expectedRowVersion: number,
    data: Partial<{
      text: string;
      visibility: string;
      verificationStatus: string;
      usagePolicy: string;
      sortOrder: number;
    }>
  ): Promise<boolean> {
    assertValidUserId(userId);

    const updated = await db
      .update(achievementBullets)
      .set({
        ...data,
        normalizedText: data.text ? data.text.trim().toLowerCase() : undefined,
        rowVersion: expectedRowVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(achievementBullets.userId, userId),
          eq(achievementBullets.id, bulletId),
          eq(achievementBullets.rowVersion, expectedRowVersion),
          isNull(achievementBullets.deletedAt)
        )
      )
      .returning({ id: achievementBullets.id });

    return updated.length > 0;
  }

  /**
   * Reorders bullets inside a Career Vault entry atomically.
   */
  static async reorderBullets(
    userId: string,
    entryId: string,
    orderedBulletIds: string[]
  ): Promise<void> {
    assertValidUserId(userId);
    const now = new Date();
    await db.transaction(async (tx) => {
      for (let idx = 0; idx < orderedBulletIds.length; idx += 1) {
        await tx
          .update(achievementBullets)
          .set({ sortOrder: idx, updatedAt: now })
          .where(
            and(
              eq(achievementBullets.userId, userId),
              eq(achievementBullets.entryId, entryId),
              eq(achievementBullets.id, orderedBulletIds[idx]),
              isNull(achievementBullets.deletedAt)
            )
          );
      }
    });
  }

  /**
   * Soft-delete bullet
   */
  static async softDeleteBullet(userId: string, bulletId: string): Promise<void> {
    assertValidUserId(userId);
    await db
      .update(achievementBullets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.id, bulletId)));
  }
}
