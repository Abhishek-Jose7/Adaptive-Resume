import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import {
  users,
  bankEntries,
  achievementBullets,
  bulletFacts,
  bulletRelations,
  sources,
  sourceEvidence,
  importBatches,
  stagedItems,
  jobs,
  jdAnalyses,
  resumeDocuments,
  resumeVersions,
  applications,
  applicationInterviews,
  coverLetters,
  careerGraphEdges,
  projectMetadata,
  quantificationInterviews,
  userUsageQuotas,
  shareLinks,
  providerCredentials,
  userOcrConsents,
  auditEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse, handleApiError } from "@/lib/api/response";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    // 1. User Profile
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Fetch all user-owned tables concurrently
    const [
      entries,
      bullets,
      facts,
      relations,
      userSources,
      evidence,
      batches,
      staged,
      resumes,
      versions,
      targetJobs,
      analyses,
      apps,
      interviews,
      letters,
      graphEdges,
      projectMeta,
      quantInterviews,
      quotas,
      ocrConsents,
      userShares,
      credentialsSafe,
      userAuditEvents,
    ] = await Promise.all([
      db.select().from(bankEntries).where(eq(bankEntries.userId, userId)),
      db.select().from(achievementBullets).where(eq(achievementBullets.userId, userId)),
      db.select().from(bulletFacts).where(eq(bulletFacts.userId, userId)),
      db.select().from(bulletRelations).where(eq(bulletRelations.userId, userId)),
      db.select().from(sources).where(eq(sources.userId, userId)),
      db.select().from(sourceEvidence).where(eq(sourceEvidence.userId, userId)),
      db.select().from(importBatches).where(eq(importBatches.userId, userId)),
      db.select().from(stagedItems).where(eq(stagedItems.userId, userId)),
      db.select().from(resumeDocuments).where(eq(resumeDocuments.userId, userId)),
      db.select().from(resumeVersions).where(eq(resumeVersions.userId, userId)),
      db.select().from(jobs).where(eq(jobs.userId, userId)),
      db.select().from(jdAnalyses).where(eq(jdAnalyses.userId, userId)),
      db.select().from(applications).where(eq(applications.userId, userId)),
      db.select().from(applicationInterviews).where(eq(applicationInterviews.userId, userId)),
      db.select().from(coverLetters).where(eq(coverLetters.userId, userId)),
      db.select().from(careerGraphEdges).where(eq(careerGraphEdges.userId, userId)),
      db.select().from(projectMetadata).where(eq(projectMetadata.userId, userId)),
      db.select().from(quantificationInterviews).where(eq(quantificationInterviews.userId, userId)),
      db.select().from(userUsageQuotas).where(eq(userUsageQuotas.userId, userId)),
      db.select().from(userOcrConsents).where(eq(userOcrConsents.userId, userId)),
      db.select().from(shareLinks).where(eq(shareLinks.userId, userId)),
      db
        .select({
          id: providerCredentials.id,
          userId: providerCredentials.userId,
          provider: providerCredentials.provider,
          keyVersion: providerCredentials.keyVersion,
          last4: providerCredentials.last4,
          isValid: providerCredentials.isValid,
          lastTestedAt: providerCredentials.lastTestedAt,
          createdAt: providerCredentials.createdAt,
          updatedAt: providerCredentials.updatedAt,
        })
        .from(providerCredentials)
        .where(eq(providerCredentials.userId, userId)),
      db.select().from(auditEvents).where(eq(auditEvents.userId, userId)),
    ]);

    const exportedTableCount = 24; // users + 23 tables queried above

    // Record this account export audit event
    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID()}`,
      userId,
      action: "account_export",
      resourceType: "account",
      resourceId: userId,
      metadataJson: { timestamp: new Date().toISOString(), tablesExported: exportedTableCount },
    });

    const exportArchive = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.2",
        tableCount: exportedTableCount,
        gdprCompliant: true,
        dataPortabilityStandard: "JSON-Schema-v1",
      },
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        createdAt: user.createdAt,
      },
      careerKnowledgeBase: {
        entries,
        bullets,
        facts,
        relations,
        careerGraphEdges: graphEdges,
        projectMetadata: projectMeta,
        quantificationInterviews: quantInterviews,
      },
      intakeAndProvenance: {
        sources: userSources,
        sourceEvidence: evidence,
        importBatches: batches,
        stagedItems: staged,
      },
      resumes: {
        documents: resumes,
        versions,
      },
      jobsAndTargeting: {
        jobs: targetJobs,
        analyses,
      },
      applicationsWorkspace: {
        applications: apps,
        interviews,
        coverLetters: letters,
      },
      sharingAndAccess: {
        shares: userShares,
      },
      accountGovernance: {
        quotas,
        ocrConsents,
        providerCredentialsMetadata: credentialsSafe,
        auditEvents: userAuditEvents,
      },
    };

    return new NextResponse(JSON.stringify(exportArchive, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="resume_maker_full_export_${userId}_${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
