import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const CommitStagedSchema = z.object({
  acceptedItems: z.array(
    z.object({
      stagedItemId: z.string(),
      overrideData: z
        .object({
          title: z.string().optional(),
          organization: z.string().nullable().optional(),
          location: z.string().nullable().optional(),
          startDate: z.string().nullable().optional(),
          endDate: z.string().nullable().optional(),
          isCurrent: z.boolean().optional(),
          descriptionContext: z.string().nullable().optional(),
          bullets: z.array(z.string()).optional(),
        })
        .optional(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: batchId } = await params;
    const body = await req.json();

    const validated = CommitStagedSchema.parse(body);

    const result = await ImportRepository.commitStagedItems(
      user.userId,
      batchId,
      validated.acceptedItems
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
