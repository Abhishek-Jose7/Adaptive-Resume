import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { jdAnalyses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ProjectRecommenderService } from "@/lib/services/projectRecommenderService";
import { JDAnalysis } from "@/types/job";

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

    const recommendations = await ProjectRecommenderService.recommendProjects(
      userId,
      jd.analysisJson as unknown as JDAnalysis
    );

    return successResponse(recommendations);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  try {
    const body = await req.json();
    const { entryId, maturityLevel, actualContribution, implementationGaps, unfinishedFeatures, limitations, isProductionReady } = body;

    if (!entryId || !maturityLevel) {
      return errorResponse("VALIDATION_ERROR", "entryId and maturityLevel are required", 400);
    }

    const updated = await ProjectRecommenderService.upsertProjectMetadata(userId, entryId, {
      maturityLevel,
      actualContribution,
      implementationGaps,
      unfinishedFeatures,
      limitations,
      isProductionReady,
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
