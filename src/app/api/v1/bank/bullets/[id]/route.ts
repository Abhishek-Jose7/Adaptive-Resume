import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const UpdateBulletSchema = z.object({
  expectedRowVersion: z.number().int().min(1),
  text: z.string().optional(),
  visibility: z.string().optional(),
  verificationStatus: z.string().optional(),
  usagePolicy: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();

    const validated = UpdateBulletSchema.parse(body);

    const success = await BankRepository.updateBullet(
      user.userId,
      id,
      validated.expectedRowVersion,
      validated
    );

    if (!success) {
      return apiError(
        "CONFLICT",
        "Conflict detected: Bullet was modified elsewhere.",
        409
      );
    }

    return apiSuccess({ success: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    await BankRepository.softDeleteBullet(user.userId, id);
    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
