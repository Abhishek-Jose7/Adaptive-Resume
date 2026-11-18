import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { stagedItems, importBatches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: batchId } = await params;

    const [batch] = await db
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.userId, user.userId), eq(importBatches.id, batchId)))
      .limit(1);

    if (!batch) {
      return apiError("NOT_FOUND", "Import batch not found", 404);
    }

    const items = await db
      .select()
      .from(stagedItems)
      .where(and(eq(stagedItems.userId, user.userId), eq(stagedItems.batchId, batchId)))
      .orderBy(stagedItems.createdAt);

    return apiSuccess({ batch, items });
  } catch (error) {
    return handleApiError(error);
  }
}
