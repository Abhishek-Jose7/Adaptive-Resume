import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { ResumeProvenanceService } from "@/lib/services/resumeProvenanceService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: resumeId } = await params;

    const provenance = await ResumeProvenanceService.getResumeProvenance(user.userId, resumeId);
    if (!provenance) {
      return apiError("NOT_FOUND", "Resume not found", 404);
    }

    return apiSuccess(provenance);
  } catch (error) {
    return handleApiError(error);
  }
}
