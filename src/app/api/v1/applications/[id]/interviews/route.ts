import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApplicationService } from "@/lib/services/applicationService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { id: applicationId } = await params;

  try {
    const body = await req.json();
    if (!body.roundName) {
      return errorResponse("VALIDATION_ERROR", "roundName is required", 400);
    }

    const interview = await ApplicationService.addInterview(userId, applicationId, body);
    return successResponse(interview, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
