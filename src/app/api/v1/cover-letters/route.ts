import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { CoverLetterService } from "@/lib/services/coverLetterService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const list = await CoverLetterService.listCoverLetters(userId);
    return successResponse(list);
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
    const created = await CoverLetterService.generateCoverLetter(userId, body);
    return successResponse(created, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
