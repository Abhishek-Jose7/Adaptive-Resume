import { NextRequest } from "next/server";
import { ShareService } from "@/lib/services/shareService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const isPreview = req.nextUrl.searchParams.get("preview") === "1";

  try {
    const resolved = await ShareService.resolveShareToken(token, {
      incrementView: !isPreview,
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
