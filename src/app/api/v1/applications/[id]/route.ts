import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ApplicationService } from "@/lib/services/applicationService";
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
    const item = await ApplicationService.getApplication(userId, id);
    if (!item) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }
    return successResponse(item);
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
    const updated = await ApplicationService.updateApplication(userId, id, body);
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
    const success = await ApplicationService.deleteApplication(userId, id);
    return successResponse({ success });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
