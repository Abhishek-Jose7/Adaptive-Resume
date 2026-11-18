import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const ParseStagedItemsSchema = z.object({
  items: z.array(
    z.object({
      entryType: z.string(),
      rawSnippet: z.string().optional(),
      parsedDataJson: z.object({
        title: z.string(),
        organization: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        descriptionContext: z.string().nullable().optional(),
        bullets: z.array(z.string()).optional(),
      }),
      confidence: z.number().optional(),
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

    const validated = ParseStagedItemsSchema.parse(body);

    const stagedIds = await ImportRepository.addStagedItems(
      user.userId,
      batchId,
      validated.items
    );

    return apiSuccess({ stagedCount: stagedIds.length, stagedIds }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
