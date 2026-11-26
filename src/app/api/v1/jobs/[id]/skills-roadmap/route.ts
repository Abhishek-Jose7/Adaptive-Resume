import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { jdAnalyses, bankEntries, achievementBullets, bulletFacts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { SkillsRoadmapEngine } from "@/lib/scoring/skillsRoadmapEngine";
import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet, BulletFact } from "@/types/bank";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(req);
    const { id: jobId } = await params;

    const [jd] = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.jobId, jobId), eq(jdAnalyses.userId, userId)))
      .limit(1);

    if (!jd) {
      return errorResponse("NOT_FOUND", "Job analysis not found. Please analyze the JD first.", 404);
    }

    const [entries, bullets, facts] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db
        .select()
        .from(bulletFacts)
        .where(eq(bulletFacts.userId, userId)),
    ]);

    const roadmap = SkillsRoadmapEngine.generateRoadmap(
      jd.analysisJson as unknown as JDAnalysis,
      entries as unknown as BankEntry[],
      bullets as unknown as AchievementBullet[],
      facts as unknown as BulletFact[]
    );

    return successResponse(roadmap);
  } catch (err) {
    return handleApiError(err);
  }
}
