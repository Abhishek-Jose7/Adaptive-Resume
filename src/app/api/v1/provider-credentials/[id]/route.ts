import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { CredentialService } from "@/lib/services/credentialService";
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
    const success = await CredentialService.deleteCredential(userId, id);
    if (!success) {
      return errorResponse("NOT_FOUND", "Credential not found", 404);
    }
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
