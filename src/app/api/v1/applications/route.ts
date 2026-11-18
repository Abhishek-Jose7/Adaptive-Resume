import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { ApplicationService } from "@/lib/services/applicationService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as any;

  try {
    const list = await ApplicationService.listApplications(userId, status);
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
    const created = await ApplicationService.createApplication(userId, body);
    return successResponse(created, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
