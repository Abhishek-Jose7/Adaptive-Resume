import { ResumeStructuringService } from "./resumeStructuringService";
import type { StagedItemInput } from "@/lib/repositories/importRepository";

/**
 * Parses extracted resume/career text using the server-side hybrid AI Pipeline A
 * (/api/v1/imports/parse-resume, with Groq/OpenRouter + deterministic cross-check)
 * and transparently falls back to client-side deterministic structuring when
 * offline, unauthenticated, or if the API request times out.
 */
export async function parseResumeTextWithFallback(
  rawText: string,
  sourceLabel: string
): Promise<StagedItemInput[]> {
  if (!rawText || !rawText.trim()) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);

    const res = await fetch("/api/v1/imports/parse-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, sourceLabel }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const payload = await res.json().catch(() => null);
      const serverItems = payload?.stagedItems || payload?.data?.stagedItems;
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        return serverItems;
      }
    }
  } catch {
    // Graceful local fallback below when offline, timed out, or unauthenticated
  }

  const structuredSections = ResumeStructuringService.structureResumeText(rawText, sourceLabel);
  return ResumeStructuringService.toStagedItemInputs(structuredSections);
}
