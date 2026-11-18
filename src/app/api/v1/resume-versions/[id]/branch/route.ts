import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { VersionService } from "@/lib/services/versionService";
import { ResumeDoc } from "@/types/resume";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { id } = await params;
  try {
    const branched = await VersionService.restoreVersion(userId, id);
    return successResponse(branched, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
