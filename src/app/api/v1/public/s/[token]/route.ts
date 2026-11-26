import { NextRequest } from "next/server";
import { ShareService } from "@/lib/services/shareService";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const isPreview = req.nextUrl.searchParams.get("preview") === "1";

  let viewerUserId: string | null = null;
  try {
    const viewer = await getAuthenticatedUser(req);
    viewerUserId = viewer?.userId || null;
  } catch {
    viewerUserId = null;
  }

  try {
    const resolved = await ShareService.resolveShareToken(token, {
      incrementView: !isPreview,
      viewerUserId,
    });
    if (!resolved) {
      return errorResponse(
        "NOT_FOUND",
        "This shared resume link is either expired, revoked, or does not exist.",
        404
      );
    }

    return successResponse(resolved);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
