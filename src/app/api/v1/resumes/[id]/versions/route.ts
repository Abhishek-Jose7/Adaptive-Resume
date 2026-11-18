import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { VersionService } from "@/lib/services/versionService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: resumeDocumentId } = await params;

  try {
    const versions = await VersionService.listVersions(userId, resumeDocumentId);
    return successResponse(versions);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
