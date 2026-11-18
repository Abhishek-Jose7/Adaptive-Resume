import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const UpdateEntrySchema = z.object({
  expectedRowVersion: z.number().int().min(1),
  title: z.string().optional(),
  organization: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  descriptionContext: z.string().nullable().optional(),
  visibility: z.string().optional(),
  verificationStatus: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    const entry = await BankRepository.getEntryById(user.userId, id);
    if (!entry) {
      return apiError("NOT_FOUND", "Bank entry not found", 404);
    }

    return apiSuccess(entry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();

    const validated = UpdateEntrySchema.parse(body);

    const success = await BankRepository.updateEntry(
      user.userId,
      id,
      validated.expectedRowVersion,
      validated
    );

    if (!success) {
      return apiError(
        "CONFLICT",
        "Conflict detected: The entry has been modified elsewhere. Please refresh.",
        409
      );
    }

    const updated = await BankRepository.getEntryById(user.userId, id);
    return apiSuccess(updated);
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

    await BankRepository.softDeleteEntry(user.userId, id);
    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
