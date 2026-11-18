import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { resumeVersions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { VersionDiffEngine } from "@/lib/editor/versionDiffEngine";
import { ResumeDoc } from "@/types/resume";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { searchParams } = new URL(req.url);
  const baseVersionId = searchParams.get("baseId");
  const targetVersionId = searchParams.get("targetId");

  if (!baseVersionId || !targetVersionId) {
    return errorResponse("VALIDATION_ERROR", "baseId and targetId are required", 400);
  }

  try {
    const [baseVer] = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.id, baseVersionId), eq(resumeVersions.userId, userId)));

    const [targetVer] = await db
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.id, targetVersionId), eq(resumeVersions.userId, userId)));

    if (!baseVer || !targetVer) {
      return errorResponse("NOT_FOUND", "One or both resume versions not found", 404);
    }

    const diff = VersionDiffEngine.computeDiff(
      baseVer.resumeDocJson as ResumeDoc,
      targetVer.resumeDocJson as ResumeDoc,
      baseVer.versionNumber,
      targetVer.versionNumber
    );

    return successResponse(diff);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
