import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApplicationService } from "@/lib/services/applicationService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { interviewId } = await params;

  try {
    const body = await req.json();
    const updated = await ApplicationService.updateInterview(userId, interviewId, body);
    if (!updated) return errorResponse("NOT_FOUND", "Interview round not found", 404);
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { interviewId } = await params;

  try {
    const deleted = await ApplicationService.deleteInterview(userId, interviewId);
    if (!deleted) return errorResponse("NOT_FOUND", "Interview round not found", 404);
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
