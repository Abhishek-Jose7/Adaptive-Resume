import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { AiResumeParserService } from "@/lib/ai/services/aiResumeParserService";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const ParseResumeRequestSchema = z.object({
  rawText: z.string().optional(),
  base64Image: z.string().optional(),
  mimeType: z.string().optional().default("image/png"),
  sourceLabel: z.string().optional().default("Uploaded Document"),
  batchId: z.string().optional(),
  forceLocal: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = ParseResumeRequestSchema.parse(body);

    if (!validated.rawText && !validated.base64Image) {
      return apiError(
        "BAD_REQUEST",
        "Either 'rawText' or 'base64Image' must be provided for AI resume parsing.",
        400
      );
    }

    let parseResult;

    if (validated.base64Image) {
      // Multimodal Vision Inference via OpenRouter Pipeline A (inclusionai/ling-3.2-flash:free)
      parseResult = await AiResumeParserService.parseFromVisionImage(
        validated.base64Image,
        validated.mimeType,
        validated.sourceLabel
      );
    } else {
      // Text parsing via OpenRouter Pipeline A with local deterministic fallback
      parseResult = await AiResumeParserService.parseFromText(
        validated.rawText!,
        validated.sourceLabel,
        { forceLocal: validated.forceLocal }
      );
    }

    let stagedIds: string[] = [];
    if (validated.batchId) {
      stagedIds = await ImportRepository.addStagedItems(
        user.userId,
        validated.batchId,
        parseResult.stagedItems
      );
    }

    return apiSuccess({
      ...parseResult,
      stagedIds,
      stagedCount: parseResult.stagedItems.length,
    }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
