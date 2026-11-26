import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { ResumeProvenanceService } from "@/lib/services/resumeProvenanceService";
import { z } from "zod";

const TailorBulletSchema = z.object({
  bulletId: z.string().min(1),
  bulletText: z.string().min(1).max(2000),
  sourceBulletIds: z.array(z.string()).optional(),
  sectionType: z.enum(["experience", "projects"]).optional(),
  entryTitle: z.string().optional(),
  organization: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: resumeId } = await params;
    const body = await req.json();
    const validated = TailorBulletSchema.parse(body);

    const result = await ResumeProvenanceService.tailorSingleDraftBullet(
      user.userId,
      resumeId,
      validated
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
