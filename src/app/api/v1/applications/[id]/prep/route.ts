import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { InterviewPrepService } from "@/lib/services/interviewPrepService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: applicationId } = await params;

    const prep = await InterviewPrepService.generateApplicationPrep(user.userId, applicationId);
    return apiSuccess(prep);
  } catch (error) {
    return handleApiError(error);
  }
}
