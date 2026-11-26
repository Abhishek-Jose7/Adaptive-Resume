import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { jobs, jdAnalyses } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { JDAnalysisService } from "@/lib/services/jdAnalysisService";
import { JDAnalysisSchema } from "@/lib/validation/job";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const KeywordOverrideSchema = z.object({
  keywords: z.array(
    z.object({
      id: z.string(),
      canonical: z.string(),
      synonyms: z.array(z.string()).default([]),
      category: z.any(),
      priority: z.enum(["must_have", "nice_to_have"]),
      importance: z.number().min(0).max(1),
      evidencePhrase: z.string().nullable().default(null),
      userOverride: z.enum(["none", "promoted", "demoted", "removed"]),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.userId), eq(jobs.id, id)))
      .limit(1);

    if (!job) {
      return apiError("NOT_FOUND", "Target job not found", 404);
    }

    const promptVersion = "v1.2";

    // Check cache by jobId and promptVersion (PRD Section 6.5 N4 / 7.7)
    const [cached] = await db
      .select()
      .from(jdAnalyses)
      .where(
        and(
          eq(jdAnalyses.userId, user.userId),
          eq(jdAnalyses.jobId, id),
          eq(jdAnalyses.promptVersion, promptVersion)
        )
      )
      .orderBy(desc(jdAnalyses.createdAt))
      .limit(1);

    if (cached) {
      return apiSuccess({ analysis: cached.analysisJson, cached: true });
    }

    // Run structured analysis
    const analysis = JDAnalysisService.analyzeDeterministic(job.rawText, promptVersion);

    // Persist analysis record
    const analysisId = `analysis_${crypto.randomUUID()}`;
    await db.insert(jdAnalyses).values({
      id: analysisId,
      userId: user.userId,
      jobId: id,
      analysisJson: analysis,
      confidence: analysis.confidence,
      promptVersion,
    });

    return apiSuccess({ analysis, cached: false }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// User overrides: promote, demote, add or remove keywords (PRD Section 6.5 N3)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();

    const validated = KeywordOverrideSchema.parse(body);

    const [latestAnalysis] = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, user.userId), eq(jdAnalyses.jobId, id)))
      .orderBy(desc(jdAnalyses.createdAt))
      .limit(1);

    if (!latestAnalysis) {
      return apiError("NOT_FOUND", "No existing analysis to update keywords for.", 404);
    }

    const currentData = latestAnalysis.analysisJson as any;
    currentData.keywords = validated.keywords;

    await db
      .update(jdAnalyses)
      .set({
        analysisJson: currentData,
        updatedAt: new Date(),
      })
      .where(and(eq(jdAnalyses.userId, user.userId), eq(jdAnalyses.id, latestAnalysis.id)));

    return apiSuccess({ analysis: currentData, updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
