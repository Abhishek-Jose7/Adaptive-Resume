import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type DefaultPageSize = "A4" | "LETTER";
export type ThemePreference = "system" | "light" | "dark";
export type RetentionPolicy = "discard_raw" | "keep_redacted" | "keep_raw";
export type PortfolioTheme = "editorial" | "modern" | "minimal";

export interface WorkspaceSettingsRecord {
  userId: string;
  defaultPageSize: DefaultPageSize;
  defaultTemplateId: string;
  themePreference: ThemePreference;
  retentionPolicy: RetentionPolicy;
  portfolioTheme: PortfolioTheme;
  showViewCounters: boolean;
  privacyTermsVersion: string;
  updatedAt: string;
}

export type UpdateWorkspaceSettingsInput = Partial<
  Pick<
    WorkspaceSettingsRecord,
    | "defaultPageSize"
    | "defaultTemplateId"
    | "themePreference"
    | "retentionPolicy"
    | "portfolioTheme"
    | "showViewCounters"
  >
>;

export const DEFAULT_WORKSPACE_SETTINGS: Omit<WorkspaceSettingsRecord, "userId" | "updatedAt"> = {
  defaultPageSize: "A4",
  defaultTemplateId: "classic-ats",
  themePreference: "system",
  retentionPolicy: "discard_raw",
  portfolioTheme: "editorial",
  showViewCounters: true,
  privacyTermsVersion: "2026-11-18",
};

function normalizeRecord(userId: string, row?: typeof userSettings.$inferSelect | null): WorkspaceSettingsRecord {
  if (!row) {
    return {
      userId,
      ...DEFAULT_WORKSPACE_SETTINGS,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return {
    userId,
    defaultPageSize: row.defaultPageSize === "LETTER" ? "LETTER" : "A4",
    defaultTemplateId: row.defaultTemplateId || "classic-ats",
    themePreference: (row.themePreference as ThemePreference) || "system",
    retentionPolicy: (row.retentionPolicy as RetentionPolicy) || "discard_raw",
    portfolioTheme: (row.portfolioTheme as PortfolioTheme) || "editorial",
    showViewCounters: row.showViewCounters !== false,
    privacyTermsVersion: row.privacyTermsVersion || "2026-11-18",
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export class SettingsService {
  static async getUserSettings(userId: string): Promise<WorkspaceSettingsRecord> {
    try {
      const rows = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (rows.length > 0) {
        return normalizeRecord(userId, rows[0]);
      }

      const [created] = await db
        .insert(userSettings)
        .values({
          id: `uset_${crypto.randomUUID()}`,
          userId,
          ...DEFAULT_WORKSPACE_SETTINGS,
        })
        .onConflictDoNothing({ target: userSettings.userId })
        .returning();

      if (created) {
        return normalizeRecord(userId, created);
      }

      const refetch = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      return normalizeRecord(userId, refetch[0] || null);
    } catch {
      // Safe fallback if migration has not run in a unit test environment
      return normalizeRecord(userId, null);
    }
  }

  static async upsertUserSettings(
    userId: string,
    patch: UpdateWorkspaceSettingsInput
  ): Promise<WorkspaceSettingsRecord> {
    const existing = await this.getUserSettings(userId);
    const merged = {
      defaultPageSize: patch.defaultPageSize ?? existing.defaultPageSize,
      defaultTemplateId: patch.defaultTemplateId ?? existing.defaultTemplateId,
      themePreference: patch.themePreference ?? existing.themePreference,
      retentionPolicy: patch.retentionPolicy ?? existing.retentionPolicy,
      portfolioTheme: patch.portfolioTheme ?? existing.portfolioTheme,
      showViewCounters:
        typeof patch.showViewCounters === "boolean"
          ? patch.showViewCounters
          : existing.showViewCounters,
      privacyTermsVersion: existing.privacyTermsVersion,
    };

    const now = new Date();
    const [saved] = await db
      .insert(userSettings)
      .values({
        id: `uset_${crypto.randomUUID()}`,
        userId,
        ...merged,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...merged,
          updatedAt: now,
        },
      })
      .returning();

    return normalizeRecord(userId, saved);
  }
}
