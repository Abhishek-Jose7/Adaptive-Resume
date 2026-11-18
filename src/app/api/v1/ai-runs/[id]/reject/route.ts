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

  const { id: runId } = await params;

  try {
    const body = await req.json();
    const { bulletId } = body;

    if (!bulletId) {
      return errorResponse("VALIDATION_ERROR", "bulletId is required", 400);
    }

    const updatedRun = await TailoringService.updateItemStatus(userId, runId, bulletId, "rejected");
    return successResponse(updatedRun);
  } catch (error: any) {
    return errorResponse("INTERNAL_ERROR", error.message || "Failed to reject item", 500);
  }
}
