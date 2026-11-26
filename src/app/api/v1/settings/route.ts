import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { SettingsService } from "@/lib/services/settingsService";
import { z } from "zod";

const SettingsUpdateSchema = z.object({
  defaultPageSize: z.enum(["A4", "LETTER"]).optional(),
  defaultTemplateId: z
    .enum([
      "classic-ats",
      "modern-ats",
      "minimal-executive",
      "technical-scholar",
      "luxurious-grid",
      "compact-engineer",
    ])
    .optional(),
  themePreference: z.enum(["system", "light", "dark"]).optional(),
  retentionPolicy: z.enum(["discard_raw", "keep_redacted", "keep_raw"]).optional(),
  portfolioTheme: z.enum(["editorial", "modern", "minimal"]).optional(),
  showViewCounters: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const settings = await SettingsService.getUserSettings(user.userId);
    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = SettingsUpdateSchema.parse(body);
    const updated = await SettingsService.upsertUserSettings(user.userId, validated);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
