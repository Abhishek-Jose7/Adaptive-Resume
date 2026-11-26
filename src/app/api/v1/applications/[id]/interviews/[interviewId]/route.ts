import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { ApplicationService } from "@/lib/services/applicationService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const userId = await getAuthUserId(req);
    const { id: applicationId, interviewId } = await params;
    const body = await req.json();
    const updated = await ApplicationService.updateInterview(
      userId,
      interviewId,
      body,
      applicationId
    );
    if (!updated) return errorResponse("NOT_FOUND", "Interview round not found", 404);
    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const userId = await getAuthUserId(req);
    const { id: applicationId, interviewId } = await params;
    const deleted = await ApplicationService.deleteInterview(
      userId,
      interviewId,
      applicationId
    );
    if (!deleted) return errorResponse("NOT_FOUND", "Interview round not found", 404);
    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
