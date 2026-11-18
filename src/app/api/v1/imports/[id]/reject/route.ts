import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const RejectStagedSchema = z.object({
  stagedItemIds: z.array(z.string()).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: batchId } = await params;
    const body = await req.json();

    const validated = RejectStagedSchema.parse(body);

    await ImportRepository.rejectStagedItems(
      user.userId,
      batchId,
      validated.stagedItemIds
    );

    return apiSuccess({ rejectedCount: validated.stagedItemIds.length });
  } catch (error) {
    return handleApiError(error);
  }
}
