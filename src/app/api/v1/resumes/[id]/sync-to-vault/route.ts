import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { ResumeProvenanceService } from "@/lib/services/resumeProvenanceService";
import { z } from "zod";

const SyncBulletSchema = z.object({
  bulletId: z.string().min(1),
  text: z.string().min(1).max(2000),
  sourceBulletIds: z.array(z.string()).optional(),
  sectionType: z.enum(["experience", "projects"]),
  entryTitle: z.string().optional(),
  organization: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: resumeId } = await params;
    const body = await req.json();
    const validated = SyncBulletSchema.parse(body);

    const result = await ResumeProvenanceService.syncDraftBulletToVault(
      user.userId,
      resumeId,
      validated
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
