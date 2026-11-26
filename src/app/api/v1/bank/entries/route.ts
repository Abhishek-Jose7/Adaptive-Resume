import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { CompletenessService } from "@/lib/services/completenessService";
import { BankEntryInputSchema } from "@/lib/validation/bank";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { EntryType } from "@/types/bank";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const entryType = searchParams.get("entryType") as EntryType | null;
    const searchQuery = searchParams.get("q") || undefined;
    const parsedLimit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 100;
    const cursorUpdated = searchParams.get("cursorUpdated");
    const cursorId = searchParams.get("cursorId");

    const cursor = cursorUpdated && cursorId ? { updatedAt: cursorUpdated, id: cursorId } : undefined;

    const result = await BankRepository.listEntries(user.userId, {
      entryType: entryType || undefined,
      searchQuery,
      limit,
      cursor,
    });

    const completeness = CompletenessService.auditBankEntries(result.items);

    return apiSuccess({
      items: result.items,
      nextCursor: result.nextCursor,
      completeness,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const validated = BankEntryInputSchema.parse(body);

    const entryId = await BankRepository.createEntry(user.userId, {
      entryType: validated.entryType,
      title: validated.title,
      organization: validated.organization,
      location: validated.location,
      startDate: validated.startDate,
      endDate: validated.endDate,
      isCurrent: validated.isCurrent,
      descriptionContext: validated.descriptionContext,
      visibility: validated.visibility,
      verificationStatus: validated.verificationStatus,
      sortOrder: validated.sortOrder,
    });

    // If bullets were provided in the creation payload, insert them
    if (validated.bullets && validated.bullets.length > 0) {
      for (const bullet of validated.bullets) {
        await BankRepository.createBullet(user.userId, entryId, {
          text: bullet.text,
          visibility: bullet.visibility,
          verificationStatus: bullet.verificationStatus,
          usagePolicy: bullet.usagePolicy,
          sortOrder: bullet.sortOrder,
          facts: bullet.facts as any,
        });
      }
    }

    const created = await BankRepository.getEntryById(user.userId, entryId);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
