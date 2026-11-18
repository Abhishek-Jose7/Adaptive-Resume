import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { successResponse, errorResponse } from "@/lib/api/response";
import { QuantificationAssistantService } from "@/lib/services/quantificationAssistant";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  const { searchParams } = new URL(req.url);
  const bulletId = searchParams.get("bulletId") || undefined;
  const entryId = searchParams.get("entryId") || undefined;

  try {
    const questions = await QuantificationAssistantService.getQuestions(userId, bulletId, entryId);
    return successResponse(questions);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return errorResponse("UNAUTHENTICATED", "Sign in required", 401);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { text, context, bulletId, entryId } = body;
      if (!text) return errorResponse("VALIDATION_ERROR", "Text is required", 400);

      if (bulletId && entryId) {
        const questions = await QuantificationAssistantService.createQuestionsForBullet(
          userId,
          bulletId,
          entryId,
          text
        );
        return successResponse(questions, 201);
      } else {
        const prompts = QuantificationAssistantService.analyzeAndGenerateQuestions(text, context);
        return successResponse(prompts);
      }
    }

    if (action === "answer") {
      const { questionId, userResponse, metricEstimate, metricUnit, isVerified } = body;
      if (!questionId || !userResponse) {
        return errorResponse("VALIDATION_ERROR", "questionId and userResponse are required", 400);
      }

      const res = await QuantificationAssistantService.answerQuestion(
        userId,
        questionId,
        userResponse,
        metricEstimate,
        metricUnit,
        Boolean(isVerified)
      );
      return successResponse(res);
    }

    return errorResponse("BAD_REQUEST", "Invalid action", 400);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
