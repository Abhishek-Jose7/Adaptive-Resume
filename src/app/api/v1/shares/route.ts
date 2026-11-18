import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ShareService } from "@/lib/services/shareService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const shares = await ShareService.listUserShares(userId);
    return successResponse(shares);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const body = await req.json();
    const { resumeVersionId, expiresInDays, redactContact, allowDownload } = body;

    if (!resumeVersionId) {
      return errorResponse("VALIDATION_ERROR", "resumeVersionId is required", 400);
    }

    const share = await ShareService.createShareLink(userId, {
      resumeVersionId,
      expiresInDays,
      redactContact,
      allowDownload,
    });

    return successResponse(share, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
