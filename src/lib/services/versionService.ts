import { db } from "../db/client";
import { resumeVersions, resumeDocuments } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { ResumeDoc } from "@/types/resume";

export class VersionService {
  /**
   * Lists all versions for a resume document
   */
  static async listVersions(userId: string, resumeDocumentId: string) {
    return await db
      .select()
      .from(resumeVersions)
      .where(
        and(
          eq(resumeVersions.userId, userId),
          eq(resumeVersions.resumeDocumentId, resumeDocumentId)
        )
      )
      .orderBy(desc(resumeVersions.versionNumber));
  }

  /**
   * Finalizes an immutable snapshot with content hash lock
   * PRD Section 9.2 & 10.1
   */
  static async finalizeVersion(userId: string, versionId: string) {
    const versions = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, versionId)))
      .limit(1);

    if (versions.length === 0) {
      throw new Error("Resume version not found");
    }

    const version = versions[0];
    if (version.immutableAt) {
      return version; // Already finalized
    }

    const docJson = version.resumeDocJson as unknown as ResumeDoc;
    const docString = JSON.stringify(docJson);
    const contentHash = createHash("sha256").update(docString).digest("hex");
    const now = new Date();

    const [finalized] = await db
      .update(resumeVersions)
      .set({
        contentHash,
        versionKind: "final",
        finalizedAt: now,
        immutableAt: now,
      })
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, versionId)))
      .returning();

    return finalized;
  }

  /**
   * Creates a new working version branched from an existing snapshot
   */
  static async restoreVersion(userId: string, versionId: string) {
    const versions = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, versionId)))
      .limit(1);

    if (versions.length === 0) {
      throw new Error("Resume version not found");
    }

    const sourceVersion = versions[0];
    const resumeDocumentId = sourceVersion.resumeDocumentId;

    const newVersionId = `ver_${crypto.randomUUID()}`;
    const docCopy: ResumeDoc = {
      ...(sourceVersion.resumeDocJson as unknown as ResumeDoc),
      versionId: newVersionId,
    };

    const docString = JSON.stringify(docCopy);
    const contentHash = createHash("sha256").update(docString).digest("hex");

    const created = await db.transaction(async (tx) => {
      // Query only the highest version number instead of transferring every version's resumeDocJson blob
      const [maxRow] = await tx
        .select({ maxNum: sql<number>`COALESCE(MAX(${resumeVersions.versionNumber}), 0)` })
        .from(resumeVersions)
        .where(
          and(
            eq(resumeVersions.userId, userId),
            eq(resumeVersions.resumeDocumentId, resumeDocumentId)
          )
        );
      const newVersionNumber = Number(maxRow?.maxNum ?? 0) + 1;

      const [inserted] = await tx
        .insert(resumeVersions)
        .values({
          id: newVersionId,
          userId,
          resumeDocumentId,
          parentVersionId: sourceVersion.id,
          versionNumber: newVersionNumber,
          versionKind: "working",
          resumeDocJson: docCopy as any,
          contentHash,
          templateId: sourceVersion.templateId,
          templateVersion: sourceVersion.templateVersion,
          themeJson: sourceVersion.themeJson,
          pageSize: sourceVersion.pageSize,
          targetPages: sourceVersion.targetPages,
        })
        .returning();

      await tx
        .update(resumeDocuments)
        .set({ updatedAt: new Date() })
        .where(and(eq(resumeDocuments.userId, userId), eq(resumeDocuments.id, resumeDocumentId)));

      return inserted;
    });

    return created;
  }
}
