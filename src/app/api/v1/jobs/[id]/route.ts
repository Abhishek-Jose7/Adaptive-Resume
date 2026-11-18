import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { jobs, jdAnalyses } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { JobScraperService } from "@/lib/services/jobScraperService";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const UpdateJobSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().nullable().optional(),
  rawText: z.string().min(10).optional(),
});

export async function GET(
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

    const [latestAnalysis] = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, user.userId), eq(jdAnalyses.jobId, id)))
      .orderBy(desc(jdAnalyses.createdAt))
      .limit(1);

    return apiSuccess({ job, analysis: latestAnalysis || null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();

    const validated = UpdateJobSchema.parse(body);

    const contentHash = validated.rawText
      ? JobScraperService.computeContentHash(validated.rawText)
      : undefined;

    await db
      .update(jobs)
      .set({
        title: validated.title,
        company: validated.company,
        location: validated.location,
        rawText: validated.rawText,
        contentHash,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.userId, user.userId), eq(jobs.id, id)));

    const [updated] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.userId), eq(jobs.id, id)))
      .limit(1);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    await db
      .delete(jobs)
      .where(and(eq(jobs.userId, user.userId), eq(jobs.id, id)));

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
