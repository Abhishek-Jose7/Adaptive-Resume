import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const ReorderBulletsSchema = z.object({
  bulletIds: z.array(z.string().min(1)).min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: entryId } = await params;
    const body = await req.json();
    const { bulletIds } = ReorderBulletsSchema.parse(body);

    await BankRepository.reorderBullets(user.userId, entryId, bulletIds);
    const updatedEntry = await BankRepository.getEntryById(user.userId, entryId);
    return apiSuccess({ success: true, entry: updatedEntry });
  } catch (error) {
    return handleApiError(error);
  }
}
