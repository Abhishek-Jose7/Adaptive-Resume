import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ResumeService } from "@/lib/services/resumeService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const list = await ResumeService.listResumes(userId);
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
    const { title, jobId, initialDoc } = body;

    if (!title) {
      return errorResponse("VALIDATION_ERROR", "Title is required", 400);
    }

    const created = await ResumeService.createResume(userId, title, jobId, initialDoc);
    return successResponse(created, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
