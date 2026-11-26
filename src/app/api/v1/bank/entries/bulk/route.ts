import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { DuplicateDetectionService } from "@/lib/services/duplicateDetectionService";
import { db } from "@/lib/db/client";
import { bankEntries, achievementBullets } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { BulkBankOperationSchema } from "@/lib/validation/bank";
import { apiSuccess, handleApiError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    if (body.action === "detect_duplicates") {
      const allEntries = await BankRepository.listEntries(user.userId, { limit: 100 });
      const duplicates = DuplicateDetectionService.findDuplicates(allEntries.items);
      return apiSuccess(duplicates);
    }

    const validated = BulkBankOperationSchema.parse(body);

    if (validated.action === "delete") {
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(bankEntries)
          .set({ deletedAt: now, updatedAt: now })
          .where(and(eq(bankEntries.userId, user.userId), inArray(bankEntries.id, validated.entryIds)));
        await tx
          .update(achievementBullets)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(
              eq(achievementBullets.userId, user.userId),
              inArray(achievementBullets.entryId, validated.entryIds)
            )
          );
      });
      return apiSuccess({ deletedCount: validated.entryIds.length });
    }

    if (validated.action === "reorder" && validated.orderMap) {
      await db.transaction(async (tx) => {
        for (const [id, order] of Object.entries(validated.orderMap!)) {
          await tx
            .update(bankEntries)
            .set({ sortOrder: order, updatedAt: new Date() })
            .where(and(eq(bankEntries.userId, user.userId), eq(bankEntries.id, id)));
        }
      });
      return apiSuccess({ updated: true });
    }

    if (validated.action === "update_visibility" && validated.visibility) {
      await db
        .update(bankEntries)
        .set({ visibility: validated.visibility, updatedAt: new Date() })
        .where(
          and(
            eq(bankEntries.userId, user.userId),
            inArray(bankEntries.id, validated.entryIds)
          )
        );
      return apiSuccess({ updatedCount: validated.entryIds.length });
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
