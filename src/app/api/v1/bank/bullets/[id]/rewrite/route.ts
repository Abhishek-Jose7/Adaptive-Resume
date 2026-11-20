import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { achievementBullets, bankEntries, bulletFacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { XyzRewriterService } from "@/lib/ai/services/xyzRewriterService";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { diffWords } from "diff";
import { escapeHtml } from "@/lib/services/tailoringService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: bulletId } = await params;
    const body = await req.json().catch(() => ({}));
    const { forceLocal, targetKeywords } = body;

    // 1. Fetch bullet
    const bullets = await db
      .select()
      .from(achievementBullets)
      .where(and(eq(achievementBullets.id, bulletId), eq(achievementBullets.userId, user.userId)))
      .limit(1);

    if (bullets.length === 0) {
      return apiError("NOT_FOUND", "Achievement bullet not found", 404);
    }

    const bullet = bullets[0];

    // 2. Fetch parent entry
    const entries = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.id, bullet.entryId), eq(bankEntries.userId, user.userId)))
      .limit(1);

    const parentEntry = entries[0] || {
      title: "Career Achievement",
      organization: null,
      descriptionContext: null,
    };

    // 3. Fetch facts
    const facts = await db
      .select()
      .from(bulletFacts)
      .where(and(eq(bulletFacts.bulletId, bulletId), eq(bulletFacts.userId, user.userId)));

    // 4. Run Google XYZ Rewrite Service
    const result = await XyzRewriterService.rewriteBullet(
      {
        id: bullet.id,
        text: bullet.text,
        facts: facts as any,
      },
      {
        id: parentEntry.id,
        title: parentEntry.title,
        organization: parentEntry.organization,
        descriptionContext: parentEntry.descriptionContext,
      },
      facts as any,
      Array.isArray(targetKeywords) ? targetKeywords : [],
      { forceLocal: Boolean(forceLocal) }
    );

    // 5. Compute word diff
    const diff = diffWords(bullet.text, result.rewrittenText);
    const diffChunks = diff.map((part) => ({
      value: part.value,
      added: Boolean(part.added),
      removed: Boolean(part.removed),
    }));
    const diffHtml = diff
      .map((part) => {
        const escaped = escapeHtml(part.value);
        if (part.added) return `<ins class="bg-press text-press">${escaped}</ins>`;
        if (part.removed) return `<del class="bg-alarm text-alarm line-through">${escaped}</del>`;
        return escaped;
      })
      .join("");

    return apiSuccess({
      ...result,
      diffChunks,
      diffHtml,
      reviewActions: ["accept", "reject", "edit", "regenerate"],
      sourceTraceability: {
        bulletId: bullet.id,
        entryId: bullet.entryId,
        verifiedFactCount: facts.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
