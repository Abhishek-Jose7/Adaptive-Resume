import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import {
  users,
  bankEntries,
  achievementBullets,
  bulletFacts,
  resumeDocuments,
  resumeVersions,
  jobs,
  jdAnalyses,
  applications,
  coverLetters,
  providerCredentials,
  shareLinks,
  auditEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    // Explicit tenant cleanup ensuring full eradication
    await db.transaction(async (tx) => {
      await tx.delete(shareLinks).where(eq(shareLinks.userId, userId));
      await tx.delete(providerCredentials).where(eq(providerCredentials.userId, userId));
      await tx.delete(coverLetters).where(eq(coverLetters.userId, userId));
      await tx.delete(applications).where(eq(applications.userId, userId));
      await tx.delete(resumeVersions).where(eq(resumeVersions.userId, userId));
      await tx.delete(resumeDocuments).where(eq(resumeDocuments.userId, userId));
      await tx.delete(jdAnalyses).where(eq(jdAnalyses.userId, userId));
      await tx.delete(jobs).where(eq(jobs.userId, userId));
      await tx.delete(bulletFacts).where(eq(bulletFacts.userId, userId));
      await tx.delete(achievementBullets).where(eq(achievementBullets.userId, userId));
      await tx.delete(bankEntries).where(eq(bankEntries.userId, userId));
      await tx.delete(auditEvents).where(eq(auditEvents.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    return successResponse({ deleted: true, message: "Account and all associated data permanently erased." });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
