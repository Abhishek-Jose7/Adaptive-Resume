import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { ImportRepository } from "@/lib/repositories/importRepository";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const CreateBatchSchema = z.object({
  sourceType: z.enum([
    "manual",
    "resume_upload",
    "linkedin_export",
    "linkedin_text",
    "github",
    "free_text",
  ]),
  sourceLabel: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = CreateBatchSchema.parse(body);

    const batch = await ImportRepository.createBatch(
      user.userId,
      validated.sourceType,
      validated.sourceLabel,
      validated.sourceUrl
    );

    return apiSuccess(batch, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
