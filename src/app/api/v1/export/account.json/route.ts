import { NextRequest, NextResponse } from "next/server";
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
  auditEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    // 1. Fetch user profile
    const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRecords.length === 0) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }
    const user = userRecords[0];

    // 2. Fetch Data Bank & Bullets
    const entries = await db.select().from(bankEntries).where(eq(bankEntries.userId, userId));
    const bullets = await db.select().from(achievementBullets).where(eq(achievementBullets.userId, userId));
    const facts = await db.select().from(bulletFacts).where(eq(bulletFacts.userId, userId));

    // 3. Fetch Resumes & Versions
    const resumes = await db.select().from(resumeDocuments).where(eq(resumeDocuments.userId, userId));
    const versions = await db.select().from(resumeVersions).where(eq(resumeVersions.userId, userId));

    // 4. Fetch Jobs & Analyses
    const targetJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const analyses = await db.select().from(jdAnalyses).where(eq(jdAnalyses.userId, userId));

    // 5. Fetch Applications & Cover Letters
    const apps = await db.select().from(applications).where(eq(applications.userId, userId));
    const letters = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));

    // Record audit event
    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID()}`,
      userId,
      action: "account_export",
      resourceType: "account",
      resourceId: userId,
      metadataJson: { timestamp: new Date().toISOString() },
    });

    const exportArchive = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.1",
        gdprCompliant: true,
      },
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        createdAt: user.createdAt,
      },
      dataBank: {
        entries,
        bullets,
        facts,
      },
      resumes: {
        documents: resumes,
        versions,
      },
      jobs: {
        records: targetJobs,
        analyses,
      },
      applications: apps,
      coverLetters: letters,
    };

    return new NextResponse(JSON.stringify(exportArchive, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="resume_maker_export_${userId}_${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
