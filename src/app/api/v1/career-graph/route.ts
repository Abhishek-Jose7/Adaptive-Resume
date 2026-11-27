import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { CareerGraphService } from "@/lib/services/careerGraphService";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  try {
    // Sync any new records and get graph
    await CareerGraphService.syncBankToGraph(userId);
    const graph = await CareerGraphService.getGraph(userId);
    return successResponse(graph);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  try {
    const body = await req.json();

    if (body?.action === "auto_categorize") {
      const summary = await CareerGraphService.autoCategorizeUnlinkedSkills(userId);
      const graph = await CareerGraphService.getGraph(userId);
      return successResponse({ ...summary, graph }, 200);
    }

    if (!body.sourceType || !body.sourceId || !body.targetType || !body.targetId || !body.relationshipType) {
      return errorResponse("VALIDATION_ERROR", "Missing required edge parameters", 400);
    }

    const edge = await CareerGraphService.addEdge(userId, body);
    return successResponse(edge, 201);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
