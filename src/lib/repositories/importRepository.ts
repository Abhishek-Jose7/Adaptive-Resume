import { db } from "../db/client";
import crypto from "crypto";
import {
  importBatches,
  stagedItems,
  sources,
  sourceEvidence,
  bankEntries,
  achievementBullets,
  bulletFacts,
  users,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { assertValidUserId } from "../db/tenant";
import { safePostgresDate } from "../utils/dateUtils";

export interface StagedItemInput {
  entryType: string;
  rawSnippet?: string;
  parsedDataJson: {
    title: string;
    organization?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    descriptionContext?: string | null;
    bullets?: string[];
  };
  confidence?: number;
}

export class ImportRepository {
  /**
   * Create an import batch and source record
   */
  static async createBatch(
    userId: string,
    sourceType: string,
    sourceLabel?: string,
    sourceUrl?: string
  ): Promise<{ batchId: string; sourceId: string }> {
    assertValidUserId(userId);
    const sourceId = `src_${crypto.randomUUID()}`;
    const batchId = `batch_${crypto.randomUUID()}`;

    await db.transaction(async (tx) => {
      await tx.insert(sources).values({
        id: sourceId,
        userId,
        sourceType,
        sourceLabel: sourceLabel || sourceType,
        sourceUrl: sourceUrl || null,
        parserVersion: "1.0",
        retentionPolicy: "discard_raw",
      });

      await tx.insert(importBatches).values({
        id: batchId,
        userId,
        sourceId,
        batchStatus: "staged",
        totalItems: 0,
        stagedItemsCount: 0,
      });
    });

    return { batchId, sourceId };
  }

  /**
   * Syncs parsed Personal Details directly into the candidate's `users` profile row.
   * - When `overwriteExisting` is false (auto-sync on parse/stage), only populates blank/null fields.
   * - When `overwriteExisting` is true (on explicit commit), updates all extracted profile fields.
   */
  static async syncPersonalDetailsToProfile(
    userId: string,
    items: Array<{ entryType: string; parsedDataJson: StagedItemInput["parsedDataJson"] }>,
    options: { overwriteExisting?: boolean } = {}
  ): Promise<void> {
    assertValidUserId(userId);
    const personalItem = items.find(
      (item) =>
        item.entryType === "profile" &&
        /personal\s*details|contact/i.test(item.parsedDataJson?.title || "")
    );
    if (!personalItem) return;

    const data = personalItem.parsedDataJson;
    const bullets = data.bullets || [];
    const emailBullet = bullets.find((b) => /^email:\s*/i.test(b))?.replace(/^email:\s*/i, "").trim();
    const phoneBullet = bullets.find((b) => /^phone:\s*/i.test(b))?.replace(/^phone:\s*/i, "").trim();
    const headlineBullet = bullets.find((b) => /^headline:\s*/i.test(b))?.replace(/^headline:\s*/i, "").trim();
    const linkBullets = bullets
      .filter((b) => /^(?:link|github|linkedin|portfolio|website):\s*/i.test(b) || /(?:https?:\/\/|github\.com|linkedin\.com)/i.test(b))
      .map((b) => b.replace(/^(?:link|github|linkedin|portfolio|website):\s*/i, "").trim())
      .filter(Boolean);

    const normalizeHttp = (url: string) =>
      /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;

    const githubLink = linkBullets.find((l) => /github\.com/i.test(l));
    const linkedinLink = linkBullets.find((l) => /linkedin\.com/i.test(l));
    const portfolioLink = linkBullets.find((l) => !/github\.com|linkedin\.com/i.test(l));

    const candidateFields: Record<string, string | undefined> = {
      displayName: data.organization?.trim() || undefined,
      contactEmail: emailBullet || undefined,
      phone: phoneBullet || undefined,
      location: data.location?.trim() || undefined,
      headline: (data.descriptionContext || headlineBullet || "").trim().slice(0, 160) || undefined,
      githubUrl: githubLink ? normalizeHttp(githubLink).slice(0, 500) : undefined,
      linkedinUrl: linkedinLink ? normalizeHttp(linkedinLink).slice(0, 500) : undefined,
      portfolioUrl: portfolioLink ? normalizeHttp(portfolioLink).slice(0, 500) : undefined,
    };

    const nonEmptyKeys = Object.keys(candidateFields).filter((k) => Boolean(candidateFields[k]));
    if (nonEmptyKeys.length === 0) return;

    const userUpdates: Record<string, any> = {};

    if (options.overwriteExisting) {
      for (const k of nonEmptyKeys) {
        userUpdates[k] = candidateFields[k];
      }
    } else {
      const [existing] = await db
        .select({
          displayName: users.displayName,
          contactEmail: users.contactEmail,
          phone: users.phone,
          location: users.location,
          headline: users.headline,
          githubUrl: users.githubUrl,
          linkedinUrl: users.linkedinUrl,
          portfolioUrl: users.portfolioUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existing) return;
      for (const k of nonEmptyKeys) {
        const cur = (existing as Record<string, any>)[k];
        if (!cur || (typeof cur === "string" && cur.trim().length === 0)) {
          userUpdates[k] = candidateFields[k];
        }
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date();
      await db.update(users).set(userUpdates).where(eq(users.id, userId));
    }
  }

  /**
   * Batch insert staged items (bounded round trips, no per-row loops)
   */
  static async addStagedItems(
    userId: string,
    batchId: string,
    items: StagedItemInput[]
  ): Promise<string[]> {
    assertValidUserId(userId);
    if (items.length === 0) return [];

    const stagedRecords = items.map((item) => ({
      id: `staged_${crypto.randomUUID()}`,
      userId,
      batchId,
      entryType: item.entryType,
      rawSnippet: item.rawSnippet || null,
      parsedDataJson: item.parsedDataJson,
      confidence: item.confidence ?? 0.9,
      status: "pending",
    }));

    await db.transaction(async (tx) => {
      await tx.insert(stagedItems).values(stagedRecords);
      await tx
        .update(importBatches)
        .set({
          totalItems: stagedRecords.length,
          stagedItemsCount: stagedRecords.length,
        })
        .where(and(eq(importBatches.userId, userId), eq(importBatches.id, batchId)));
    });

    return stagedRecords.map((r) => r.id);
  }

  /**
   * Get staged items for an import batch
   */
  static async getStagedItems(userId: string, batchId: string) {
    assertValidUserId(userId);
    return db
      .select()
      .from(stagedItems)
      .where(and(eq(stagedItems.userId, userId), eq(stagedItems.batchId, batchId)))
      .orderBy(stagedItems.createdAt);
  }

  /**
   * Commit accepted staged items to Bank Entries and Bullets in a single transaction.
   * Section 7.10 performance requirement: bulk acceptance in <= 5 bounded round trips.
   */
  static async commitStagedItems(
    userId: string,
    batchId: string,
    acceptedItems: Array<{
      stagedItemId: string;
      overrideData?: Partial<StagedItemInput["parsedDataJson"]>;
    }>
  ): Promise<{ committedCount: number; entryIds: string[] }> {
    assertValidUserId(userId);
    if (acceptedItems.length === 0) return { committedCount: 0, entryIds: [] };

    const acceptedIds = acceptedItems.map((a) => a.stagedItemId);

    // 1. Fetch staged rows in one batch query
    const rows = await db
      .select()
      .from(stagedItems)
      .where(
        and(
          eq(stagedItems.userId, userId),
          eq(stagedItems.batchId, batchId),
          inArray(stagedItems.id, acceptedIds)
        )
      );

    const overrideMap = new Map(acceptedItems.map((a) => [a.stagedItemId, a.overrideData]));
    const newEntryIds: string[] = [];

    // 0. Fetch batch to obtain linked sourceId for full provenance chain
    const [batchRecord] = await db
      .select({ sourceId: importBatches.sourceId })
      .from(importBatches)
      .where(and(eq(importBatches.userId, userId), eq(importBatches.id, batchId)))
      .limit(1);

    const sourceId = batchRecord?.sourceId || null;

    await db.transaction(async (tx) => {
      const entryInserts: Array<typeof bankEntries.$inferInsert> = [];
      const bulletInserts: Array<typeof achievementBullets.$inferInsert> = [];
      const factInserts: Array<typeof bulletFacts.$inferInsert> = [];
      const evidenceInserts: Array<typeof sourceEvidence.$inferInsert> = [];
      const statusUpdates: string[] = [];

      for (const row of rows) {
        const rawData = row.parsedDataJson as StagedItemInput["parsedDataJson"];
        const overrides = overrideMap.get(row.id) || {};
        const data = { ...rawData, ...overrides };

        const entryId = `entry_${crypto.randomUUID()}`;
        newEntryIds.push(entryId);
        statusUpdates.push(row.id);

        if (row.entryType === "profile" && /personal\s*details|contact/i.test(data.title)) {
          const bullets = data.bullets || [];
          const emailBullet = bullets.find((b) => /^email:\s*/i.test(b))?.replace(/^email:\s*/i, "").trim();
          const phoneBullet = bullets.find((b) => /^phone:\s*/i.test(b))?.replace(/^phone:\s*/i, "").trim();
          const headlineBullet = bullets.find((b) => /^headline:\s*/i.test(b))?.replace(/^headline:\s*/i, "").trim();
          const linkBullets = bullets
            .filter((b) => /^(?:link|github|linkedin|portfolio|website):\s*/i.test(b) || /(?:https?:\/\/|github\.com|linkedin\.com)/i.test(b))
            .map((b) => b.replace(/^(?:link|github|linkedin|portfolio|website):\s*/i, "").trim())
            .filter(Boolean);
          const normalizeHttp = (url: string) => (url.startsWith("http") ? url : `https://${url}`);
          const githubBullet = linkBullets.find((b) => /github\.com/i.test(b));
          const linkedinBullet = linkBullets.find((b) => /linkedin\.com/i.test(b));
          const portfolioBullet = linkBullets.find((b) => !/github\.com|linkedin\.com/i.test(b));

          const userUpdates: Record<string, any> = {};
          if (data.organization) userUpdates.displayName = data.organization;
          if (emailBullet) userUpdates.contactEmail = emailBullet;
          if (phoneBullet) userUpdates.phone = phoneBullet;
          if (data.location) userUpdates.location = data.location;
          if (data.descriptionContext || headlineBullet) {
            userUpdates.headline = (data.descriptionContext || headlineBullet || "").slice(0, 160);
          }
          if (githubBullet) userUpdates.githubUrl = normalizeHttp(githubBullet);
          if (linkedinBullet) userUpdates.linkedinUrl = normalizeHttp(linkedinBullet);
          if (portfolioBullet) userUpdates.portfolioUrl = normalizeHttp(portfolioBullet);

          if (Object.keys(userUpdates).length > 0) {
            userUpdates.updatedAt = new Date();
            await tx.update(users).set(userUpdates).where(eq(users.id, userId));
          }
        }

        let evidenceId: string | null = null;
        if (sourceId) {
          evidenceId = `ev_${crypto.randomUUID()}`;
          const snippetText = row.rawSnippet || data.title || "Imported content";
          evidenceInserts.push({
            id: evidenceId,
            userId,
            sourceId,
            sourceLocator: `import_batch:${batchId}:${row.entryType}`,
            snippet: snippetText.substring(0, 1000),
            contentHash: crypto.createHash("sha256").update(snippetText).digest("hex"),
            confidence: row.confidence ?? 0.9,
          });
        }

        const isCurrent = Boolean(
          data.isCurrent ||
          (data.endDate && /^(present|current|now|ongoing)$/i.test(data.endDate.trim()))
        );

        entryInserts.push({
          id: entryId,
          userId,
          entryType: row.entryType,
          title: data.title || "Imported Item",
          organization: data.organization || null,
          location: data.location || null,
          startDate: safePostgresDate(data.startDate, false),
          endDate: isCurrent ? null : safePostgresDate(data.endDate, true),
          isCurrent,
          descriptionContext: data.descriptionContext || null,
          visibility: "private",
          verificationStatus: "user_verified",
          sortOrder: 0,
          rowVersion: 1,
        });

        if (data.bullets && data.bullets.length > 0) {
          data.bullets.forEach((bulletText, bIdx) => {
            const bulletId = `bullet_${crypto.randomUUID()}`;
            bulletInserts.push({
              id: bulletId,
              userId,
              entryId,
              text: bulletText,
              normalizedText: bulletText.trim().toLowerCase(),
              visibility: "private",
              verificationStatus: "user_verified",
              usagePolicy: "eligible",
              sortOrder: bIdx,
              rowVersion: 1,
              sourceId: sourceId || undefined,
            });

            // Index each skill as an individual fact for precise ATS / role matching
            if (row.entryType === "skill_group" || row.entryType === "skill") {
              factInserts.push({
                id: `fact_${crypto.randomUUID()}`,
                userId,
                bulletId,
                entryId,
                factType: "tool",
                factKey: "skill",
                valueText: bulletText.trim(),
                verificationStatus: "user_verified",
              });
            }
          });
        }
      }

      // 1. Batch insert source evidence if present
      if (evidenceInserts.length > 0) {
        await tx.insert(sourceEvidence).values(evidenceInserts);
      }

      // 2. Batch insert entries (1 query)
      if (entryInserts.length > 0) {
        await tx.insert(bankEntries).values(entryInserts);
      }

      // 3. Batch insert bullets (1 query)
      if (bulletInserts.length > 0) {
        await tx.insert(achievementBullets).values(bulletInserts);
      }

      // 4. Batch insert individual skill/tool facts (1 query)
      if (factInserts.length > 0) {
        await tx.insert(bulletFacts).values(factInserts);
      }

      // 4. Update staged items status (1 query)
      if (statusUpdates.length > 0) {
        await tx
          .update(stagedItems)
          .set({ status: "accepted" })
          .where(
            and(
              eq(stagedItems.userId, userId),
              inArray(stagedItems.id, statusUpdates)
            )
          );
      }

      // 5. Update batch status (1 query)
      await tx
        .update(importBatches)
        .set({ batchStatus: "committed" })
        .where(and(eq(importBatches.userId, userId), eq(importBatches.id, batchId)));
    });

    return { committedCount: rows.length, entryIds: newEntryIds };
  }

  /**
   * Reject staged items
   */
  static async rejectStagedItems(userId: string, batchId: string, stagedItemIds: string[]) {
    assertValidUserId(userId);
    if (stagedItemIds.length === 0) return;

    await db
      .update(stagedItems)
      .set({ status: "rejected" })
      .where(
        and(
          eq(stagedItems.userId, userId),
          eq(stagedItems.batchId, batchId),
          inArray(stagedItems.id, stagedItemIds)
        )
      );
  }
}
