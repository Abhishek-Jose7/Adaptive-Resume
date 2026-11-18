import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ResumeService } from "@/lib/services/resumeService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { id: resumeId } = await params;

  try {
    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) {
      return errorResponse("NOT_FOUND", "Resume not found", 404);
    }
    return successResponse(resume);
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

  const { id: resumeId } = await params;

  try {
    const body = await req.json();
    const { document, versionNumber } = body;

    if (!document) {
      return errorResponse("VALIDATION_ERROR", "Document is required for autosave", 400);
    }

    const saved = await ResumeService.autosaveDraft(userId, resumeId, document, versionNumber);
    return successResponse(saved);
  } catch (err: any) {
    if (err.message.startsWith("VERSION_IMMUTABLE")) {
      return errorResponse("VERSION_IMMUTABLE", err.message, 400);
    }
    if (err.message.startsWith("CONFLICT")) {
      return errorResponse("CONFLICT", err.message, 409);
    }
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
