import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { InterviewPrepService } from "@/lib/services/interviewPrepService";
import { z } from "zod";

const FollowUpSchema = z.object({
  kind: z.enum(["follow_up", "thank_you"]).optional(),
  roundId: z.string().optional(),
  saveToCoverLetters: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: applicationId } = await params;
    const body = await req.json().catch(() => ({}));
    const validated = FollowUpSchema.parse(body);

    const draft = await InterviewPrepService.generateFollowUpDraft(
      user.userId,
      applicationId,
      validated
    );
    return apiSuccess(draft, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
