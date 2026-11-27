import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { TailoringService } from "@/lib/services/tailoringService";
import { successResponse, errorResponse } from "@/lib/api/response";

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
    const { provider, apiKey, mode, targetBulletId, targetSectionType, pinnedBulletIds, autoAcceptPassed } = body;

    const runDetails = await TailoringService.tailorJob(
      userId,
      jobId,
      provider,
      apiKey,
      { mode, targetBulletId, targetSectionType, pinnedBulletIds, autoAcceptPassed }
    );
    return successResponse(runDetails, 201);
  } catch (error: any) {
    console.error("Tailoring job error:", error);
    return errorResponse("JOB_FAILED", error.message || "Failed to tailor job bullets", 500);
  }
}
