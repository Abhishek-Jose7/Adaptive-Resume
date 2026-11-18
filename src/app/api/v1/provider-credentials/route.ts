import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { CredentialService } from "@/lib/services/credentialService";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const creds = await CredentialService.listCredentials(userId);
    return successResponse(creds);
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
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return errorResponse("VALIDATION_ERROR", "provider and apiKey are required", 400);
    }

    const stored = await CredentialService.storeCredential(userId, provider, apiKey);
    return successResponse(stored, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
