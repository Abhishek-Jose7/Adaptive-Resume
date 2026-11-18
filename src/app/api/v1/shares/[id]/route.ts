import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ShareService } from "@/lib/services/shareService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id } = await params;

  try {
    const revoked = await ShareService.revokeShareLink(userId, id);
    if (!revoked) {
      return errorResponse("NOT_FOUND", "Share link not found", 404);
    }
    return successResponse({ revoked: true });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
