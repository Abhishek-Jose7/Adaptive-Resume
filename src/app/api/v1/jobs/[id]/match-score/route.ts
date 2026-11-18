import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { jdAnalyses, bankEntries, achievementBullets, bulletFacts, resumeDocuments, resumeVersions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MatchScoreEngine } from "@/lib/scoring/matchScoreEngine";
import { GapReportEngine } from "@/lib/scoring/gapReportEngine";
import { successResponse, errorResponse } from "@/lib/api/response";
import { JDAnalysis } from "@/types/job";
import { ResumeDoc } from "@/types/resume";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: jobId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    let { resumeDoc, resumeVersionId } = body;

    // If resumeDoc not provided in body, fetch latest resume version
    if (!resumeDoc && resumeVersionId) {
      const vList = await db
        .select()
        .from(resumeVersions)
        .where(and(eq(resumeVersions.userId, userId), eq(resumeVersions.id, resumeVersionId)))
        .limit(1);
      if (vList.length > 0) {
        resumeDoc = vList[0].resumeDocJson as unknown as ResumeDoc;
      }
    }

    if (!resumeDoc) {
      // Find latest working resume version for user
      const vList = await db
        .select()
        .from(resumeVersions)
        .where(eq(resumeVersions.userId, userId))
        .orderBy(desc(resumeVersions.createdAt))
        .limit(1);

      if (vList.length > 0) {
        resumeDoc = vList[0].resumeDocJson as unknown as ResumeDoc;
      }
    }

    // Fetch JD Analysis
    const jdList = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
      .limit(1);

    if (jdList.length === 0) {
      return errorResponse("NOT_FOUND", "JD analysis not found for job. Analyze JD first.", 404);
    }

    const jdAnalysis = jdList[0].analysisJson as unknown as JDAnalysis;

    // Fetch Bank entries for grounding verification
    const userEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, userId));

    const userBullets = await db
      .select()
      .from(achievementBullets)
      .where(eq(achievementBullets.userId, userId));

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of userBullets) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b as unknown as AchievementBullet);
      bulletsByEntry.set(b.entryId, list);
    }

    const fullEntries: BankEntry[] = userEntries.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    // If no resumeDoc found at all, create an empty skeleton for score calculation
    const currentResume: ResumeDoc = resumeDoc || {
      schemaVersion: 1,
      profile: { fullName: "", email: "", phone: null, location: null, links: [], headline: null, summary: null },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    };

    const matchScore = MatchScoreEngine.calculateScore(currentResume, jdAnalysis, fullEntries);
    const gapReport = GapReportEngine.generateReport(currentResume, jdAnalysis, fullEntries);

    return successResponse({
      jobId,
      matchScore,
      gapReport,
    });
  } catch (error: any) {
    console.error("Match score calculation error:", error);
    return errorResponse("INTERNAL_ERROR", error.message || "Failed to calculate match score", 500);
  }
}
