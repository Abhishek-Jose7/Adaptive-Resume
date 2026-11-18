import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const SettingsUpdateSchema = z.object({
  defaultPageSize: z.enum(["A4", "LETTER"]).optional(),
  defaultTemplateId: z.string().optional(),
  themePreference: z.enum(["system", "light", "dark"]).optional(),
});

// Default settings memory/user settings
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    return apiSuccess({
      userId: user.userId,
      defaultPageSize: "A4",
      defaultTemplateId: "classic-ats",
      themePreference: "system",
      retentionPolicy: "discard_raw",
      privacyTermsVersion: "2026-11-18",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = SettingsUpdateSchema.parse(body);

    return apiSuccess({
      userId: user.userId,
      ...validated,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
