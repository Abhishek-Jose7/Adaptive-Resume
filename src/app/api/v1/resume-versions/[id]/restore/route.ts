import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { VersionService } from "@/lib/services/versionService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: versionId } = await params;

  try {
    const restored = await VersionService.restoreVersion(userId, versionId);
    return successResponse(restored, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
