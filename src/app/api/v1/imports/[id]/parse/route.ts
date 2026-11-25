import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { AiResumeParserService } from "@/lib/ai/services/aiResumeParserService";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const ParseStagedItemsSchema = z.object({
  items: z.array(
    z.object({
      entryType: z.string(),
      rawSnippet: z.string().optional(),
      parsedDataJson: z.object({
        title: z.string(),
        organization: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        descriptionContext: z.string().nullable().optional(),
        bullets: z.array(z.string()).optional(),
      }),
      confidence: z.number().optional(),
    })
  ).optional(),
  rawText: z.string().optional(),
  base64Image: z.string().optional(),
  mimeType: z.string().optional(),
  sourceLabel: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: batchId } = await params;
    const body = await req.json();

    const validated = ParseStagedItemsSchema.parse(body);

    if (validated.items && validated.items.length > 0) {
      await ImportRepository.syncPersonalDetailsToProfile(user.userId, validated.items, {
        overwriteExisting: false,
      }).catch((err) => console.warn("Failed to auto-sync personal details to profile:", err));
      const stagedIds = await ImportRepository.addStagedItems(
        user.userId,
        batchId,
        validated.items
      );
      const items = await ImportRepository.getStagedItems(user.userId, batchId);
      return apiSuccess({ stagedCount: stagedIds.length, stagedIds, items }, 201);
    }

    if (validated.base64Image) {
      const parseResult = await AiResumeParserService.parseFromVisionImage(
        validated.base64Image,
        validated.mimeType || "image/png",
        validated.sourceLabel || "Scanned Resume"
      );
      await ImportRepository.syncPersonalDetailsToProfile(user.userId, parseResult.stagedItems, {
        overwriteExisting: false,
      }).catch((err) => console.warn("Failed to auto-sync personal details to profile:", err));
      const stagedIds = await ImportRepository.addStagedItems(
        user.userId,
        batchId,
        parseResult.stagedItems
      );
      const items = await ImportRepository.getStagedItems(user.userId, batchId);
      return apiSuccess({
        stagedCount: stagedIds.length,
        stagedIds,
        items,
        normalized: parseResult.normalized,
        parserModel: parseResult.parserModel,
        isVision: true,
      }, 201);
    }

    if (validated.rawText) {
      const parseResult = await AiResumeParserService.parseFromText(
        validated.rawText,
        validated.sourceLabel || "Uploaded Resume"
      );
      await ImportRepository.syncPersonalDetailsToProfile(user.userId, parseResult.stagedItems, {
        overwriteExisting: false,
      }).catch((err) => console.warn("Failed to auto-sync personal details:", err));
      const stagedIds = await ImportRepository.addStagedItems(
        user.userId,
        batchId,
        parseResult.stagedItems
      );
      const items = await ImportRepository.getStagedItems(user.userId, batchId);
      return apiSuccess({
        stagedCount: stagedIds.length,
        stagedIds,
        items,
        normalized: parseResult.normalized,
        parserModel: parseResult.parserModel,
        isVision: false,
      }, 201);
    }

    return apiSuccess({ stagedCount: 0, stagedIds: [], items: [] }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
