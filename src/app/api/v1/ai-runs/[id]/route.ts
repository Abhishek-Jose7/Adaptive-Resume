import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { TailoringService } from "@/lib/services/tailoringService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: runId } = await params;

  try {
    const run = await TailoringService.getRun(userId, runId);
    if (!run) {
      return errorResponse("NOT_FOUND", "AI run not found", 404);
    }
    return successResponse(run);
  } catch (error: any) {
    return errorResponse("INTERNAL_ERROR", error.message || "Failed to fetch AI run", 500);
  }
}
