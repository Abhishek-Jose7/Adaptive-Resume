import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { jdAnalyses, bankEntries, achievementBullets, bulletFacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SkillsRoadmapEngine } from "@/lib/scoring/skillsRoadmapEngine";
import { JDAnalysis } from "@/types/job";
import { BankEntry, AchievementBullet, BulletFact } from "@/types/bank";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { id: jobId } = await params;

  try {
    const [jd] = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.jobId, jobId), eq(jdAnalyses.userId, userId)));

    if (!jd) {
      return errorResponse("NOT_FOUND", "Job analysis not found. Please analyze the JD first.", 404);
    }

    const entries = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, userId), eq(bankEntries.deletedAt, null as any)));

    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.deletedAt, null as any)));

    const facts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    const roadmap = SkillsRoadmapEngine.generateRoadmap(
      jd.analysisJson as unknown as JDAnalysis,
      entries as unknown as BankEntry[],
      bullets as unknown as AchievementBullet[],
      facts as unknown as BulletFact[]
    );

    return successResponse(roadmap);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
