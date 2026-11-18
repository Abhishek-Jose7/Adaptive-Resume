import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { CoverLetterService } from "@/lib/services/coverLetterService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id } = await params;

  try {
    const letter = await CoverLetterService.getCoverLetter(userId, id);
    if (!letter) {
      return errorResponse("NOT_FOUND", "Cover letter not found", 404);
    }
    return successResponse(letter);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await CoverLetterService.updateCoverLetter(userId, id, body);
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

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
    const success = await CoverLetterService.deleteCoverLetter(userId, id);
    return successResponse({ success });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
