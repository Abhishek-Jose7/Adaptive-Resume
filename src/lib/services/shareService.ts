import { db } from "../db/client";
import { shareLinks, resumeVersions, users, auditEvents } from "../db/schema";
import { eq, and, gt, isNull, desc, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { ResumeDoc } from "@/types/resume";
import { SettingsService } from "./settingsService";

export interface CreateShareLinkInput {
  resumeVersionId: string;
  expiresInDays?: number; // Default 30 days
  redactContact?: boolean; // Default true
  allowDownload?: boolean; // Default true
}

export interface ShareLinkResponse {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt: Date;
  redactContact: boolean;
  allowDownload: boolean;
  createdAt: Date;
}

export class ShareService {
  /**
   * Generates a cryptographically secure expiring share link for a resume version
   * PRD Section 11 & 12
   */
  static async createShareLink(
    userId: string,
    input: CreateShareLinkInput
  ): Promise<ShareLinkResponse> {
    const {
      resumeVersionId,
      expiresInDays = 30,
      redactContact = true,
      allowDownload = true,
    } = input;

    // Verify version belongs to user
    const versions = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, resumeVersionId)))
      .limit(1);

    if (versions.length === 0) {
      throw new Error("Resume version not found or unauthorized");
    }

    // Generate secure URL-safe token
    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const id = `share_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(shareLinks)
      .values({
        id,
        userId,
        resumeVersionId,
        tokenHash,
        scopeJson: { allowDownload, targetVersion: resumeVersionId },
        redactionsJson: { redactContact },
        expiresAt,
      })
      .returning();

    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID()}`,
      userId,
      action: "share_created",
      resourceType: "share_link",
      resourceId: id,
      metadataJson: { resumeVersionId, expiresInDays, redactContact },
    });

    return {
      id: created.id,
      token,
      shareUrl: `/s/${token}`,
      expiresAt: created.expiresAt,
      redactContact,
      allowDownload,
      createdAt: created.createdAt,
    };
  }

  /**
   * Resolves a public share token without requiring authentication and tracks view analytics.
   */
  static async resolveShareToken(token: string, options: { incrementView?: boolean } = {}) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const links = await db
      .select({
        id: shareLinks.id,
        userId: shareLinks.userId,
        resumeVersionId: shareLinks.resumeVersionId,
        scopeJson: shareLinks.scopeJson,
        redactionsJson: shareLinks.redactionsJson,
        expiresAt: shareLinks.expiresAt,
        revokedAt: shareLinks.revokedAt,
        viewCount: shareLinks.viewCount,
        lastViewedAt: shareLinks.lastViewedAt,
        resumeDocJson: resumeVersions.resumeDocJson,
        templateId: resumeVersions.templateId,
        themeJson: resumeVersions.themeJson,
        pageSize: resumeVersions.pageSize,
        authorName: users.displayName,
      })
      .from(shareLinks)
      .innerJoin(resumeVersions, eq(shareLinks.resumeVersionId, resumeVersions.id))
      .innerJoin(users, eq(shareLinks.userId, users.id))
      .where(
        and(
          eq(shareLinks.tokenHash, tokenHash),
          isNull(shareLinks.revokedAt),
          gt(shareLinks.expiresAt, now)
        )
      )
      .limit(1);

    if (links.length === 0) return null;

    const link = links[0];
    const ownerSettings = await SettingsService.getUserSettings(link.userId);
    let currentViewCount = link.viewCount ?? 0;
    let currentLastViewedAt = link.lastViewedAt;

    if (options.incrementView !== false) {
      try {
        const [updated] = await db
          .update(shareLinks)
          .set({
            viewCount: sql`${shareLinks.viewCount} + 1`,
            lastViewedAt: now,
          })
          .where(eq(shareLinks.id, link.id))
          .returning({ viewCount: shareLinks.viewCount, lastViewedAt: shareLinks.lastViewedAt });
        if (updated) {
          currentViewCount = updated.viewCount;
          currentLastViewedAt = updated.lastViewedAt;
        }
      } catch {
        // Resilient if view columns haven't migrated in an external environment
      }
    }

    const rawDoc = link.resumeDocJson as unknown as ResumeDoc;
    const redactions = (link.redactionsJson as any) || {};
    const scope = (link.scopeJson as any) || {};

    const docCopy: ResumeDoc = JSON.parse(JSON.stringify(rawDoc));

    if (redactions.redactContact && docCopy.profile) {
      docCopy.profile = {
        ...docCopy.profile,
        email: "[Contact via Shared Profile]",
        phone: "[Hidden for Privacy]",
        location: docCopy.profile.location ? docCopy.profile.location.split(",")[0] : undefined,
      };
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((link.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: link.id,
      resumeDoc: docCopy,
      templateId: link.templateId,
      themeJson: link.themeJson,
      pageSize: link.pageSize,
      allowDownload: scope.allowDownload !== false,
      expiresAt: link.expiresAt,
      daysRemaining,
      isExpiringSoon: daysRemaining <= 5,
      authorName: link.authorName,
      showViewCounters: ownerSettings.showViewCounters,
      viewCount: ownerSettings.showViewCounters ? currentViewCount : undefined,
      lastViewedAt: ownerSettings.showViewCounters ? currentLastViewedAt : undefined,
    };
  }

  /**
   * Lists share links for user with view analytics and expiry status notifications
   */
  static async listUserShares(userId: string) {
    const now = Date.now();
    const rows = await db
      .select({
        id: shareLinks.id,
        resumeVersionId: shareLinks.resumeVersionId,
        scopeJson: shareLinks.scopeJson,
        redactionsJson: shareLinks.redactionsJson,
        expiresAt: shareLinks.expiresAt,
        revokedAt: shareLinks.revokedAt,
        viewCount: shareLinks.viewCount,
        lastViewedAt: shareLinks.lastViewedAt,
        createdAt: shareLinks.createdAt,
      })
      .from(shareLinks)
      .where(eq(shareLinks.userId, userId))
      .orderBy(desc(shareLinks.createdAt));

    return rows.map((row) => {
      const expiresMs = row.expiresAt.getTime();
      const daysRemaining = Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24));
      const isExpired = expiresMs <= now;
      const isExpiringSoon = !row.revokedAt && !isExpired && daysRemaining <= 5;
      return {
        ...row,
        viewCount: row.viewCount ?? 0,
        daysRemaining: Math.max(0, daysRemaining),
        isExpired,
        isExpiringSoon,
      };
    });
  }

  /**
   * Revokes a share link
   */
  static async revokeShareLink(userId: string, id: string): Promise<boolean> {
    const now = new Date();
    const [updated] = await db
      .update(shareLinks)
      .set({ revokedAt: now })
      .where(and(eq(shareLinks.userId, userId), eq(shareLinks.id, id)))
      .returning();

    if (updated) {
      await db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID()}`,
        userId,
        action: "share_revoked",
        resourceType: "share_link",
        resourceId: id,
      });
    }

    return Boolean(updated);
  }
}
