import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { AchievementBulletInputSchema } from "@/lib/validation/bank";
import { apiSuccess, handleApiError } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: entryId } = await params;
    const body = await req.json();

    const validated = AchievementBulletInputSchema.parse(body);

    const bulletId = await BankRepository.createBullet(user.userId, entryId, {
      text: validated.text,
      normalizedText: validated.normalizedText,
      visibility: validated.visibility,
      verificationStatus: validated.verificationStatus,
      usagePolicy: validated.usagePolicy,
      sortOrder: validated.sortOrder,
      facts: validated.facts as any,
    });

    const updatedEntry = await BankRepository.getEntryById(user.userId, entryId);
    return apiSuccess({ bulletId, entry: updatedEntry }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
