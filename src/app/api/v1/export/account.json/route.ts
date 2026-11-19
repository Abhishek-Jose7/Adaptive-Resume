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
import { errorResponse } from "@/lib/api/response";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    // 1. User Profile
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // 2. Data Bank & Bullets
    const entries = await db.select().from(bankEntries).where(eq(bankEntries.userId, userId));
    const bullets = await db.select().from(achievementBullets).where(eq(achievementBullets.userId, userId));
    const facts = await db.select().from(bulletFacts).where(eq(bulletFacts.userId, userId));
    const relations = await db.select().from(bulletRelations).where(eq(bulletRelations.userId, userId));

    // 3. Provenance & Ingestion Sources
    const userSources = await db.select().from(sources).where(eq(sources.userId, userId));
    const evidence = await db.select().from(sourceEvidence).where(eq(sourceEvidence.userId, userId));
    const batches = await db.select().from(importBatches).where(eq(importBatches.userId, userId));
    const staged = await db.select().from(stagedItems).where(eq(stagedItems.userId, userId));

    // 4. Resumes & Versions
    const resumes = await db.select().from(resumeDocuments).where(eq(resumeDocuments.userId, userId));
    const versions = await db.select().from(resumeVersions).where(eq(resumeVersions.userId, userId));

    // 5. Jobs & Analyses
    const targetJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const analyses = await db.select().from(jdAnalyses).where(eq(jdAnalyses.userId, userId));

    // 6. Applications & Interviews
    const apps = await db.select().from(applications).where(eq(applications.userId, userId));
    const interviews = await db.select().from(applicationInterviews).where(eq(applicationInterviews.userId, userId));

    // 7. Cover Letters
    const letters = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));

    // 8. Career Graph & Quantification Metadata
    const graphEdges = await db.select().from(careerGraphEdges).where(eq(careerGraphEdges.userId, userId));
    const projectMeta = await db.select().from(projectMetadata).where(eq(projectMetadata.userId, userId));
    const quantInterviews = await db.select().from(quantificationInterviews).where(eq(quantificationInterviews.userId, userId));

    // 9. Quotas & Consents
    const quotas = await db.select().from(userUsageQuotas).where(eq(userUsageQuotas.userId, userId));
    const ocrConsents = await db.select().from(userOcrConsents).where(eq(userOcrConsents.userId, userId));

    // 10. Shares (shareLinks)
    const userShares = await db.select().from(shareLinks).where(eq(shareLinks.userId, userId));

    // 11. Provider Credentials (Safe metadata projection: exclude ciphertext)
    const credentialsSafe = await db
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
      .where(eq(providerCredentials.userId, userId));

    // 12. Audit Events
    const userAuditEvents = await db.select().from(auditEvents).where(eq(auditEvents.userId, userId));

    // Record this account export audit event
    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID()}`,
      userId,
      action: "account_export",
      resourceType: "account",
      resourceId: userId,
      metadataJson: { timestamp: new Date().toISOString(), tablesExported: 25 },
    });

    const exportArchive = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.2",
        tableCount: 25,
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
