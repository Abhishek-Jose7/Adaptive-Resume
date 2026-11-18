import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { CareerGraphService } from "@/lib/services/careerGraphService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { id } = await params;
  try {
    const deleted = await CareerGraphService.removeEdge(userId, id);
    if (!deleted) return errorResponse("NOT_FOUND", "Edge not found", 404);
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
