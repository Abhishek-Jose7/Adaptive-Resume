import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users, bankEntries, achievementBullets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const userRecords = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (userRecords.length === 0) {
      return errorResponse("NOT_FOUND", "Public profile not found", 404);
    }

    const user = userRecords[0];

    // Fetch public profile entry if present
    const profileEntries = await db
      .select()
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, user.id), eq(bankEntries.entryType, "profile")))
      .limit(1);

    const profileEntry = profileEntries[0];
    const candidateProfile = {
      id: user.id,
      username: user.username,
      fullName: profileEntry?.title || user.displayName || user.username,
      headline: profileEntry?.organization || "Professional",
      location: profileEntry?.location || undefined,
      bio: profileEntry?.descriptionContext || undefined,
      createdAt: user.createdAt,
    };

    // Fetch public entries
    const entries = await db
      .select({
        id: bankEntries.id,
        entryType: bankEntries.entryType,
        title: bankEntries.title,
        organization: bankEntries.organization,
        location: bankEntries.location,
        startDate: bankEntries.startDate,
        endDate: bankEntries.endDate,
        isCurrent: bankEntries.isCurrent,
        descriptionContext: bankEntries.descriptionContext,
      })
      .from(bankEntries)
      .where(and(eq(bankEntries.userId, user.id), eq(bankEntries.visibility, "public")));

    // Fetch verified public bullets
    const bullets = await db
      .select({
        id: achievementBullets.id,
        entryId: achievementBullets.entryId,
        text: achievementBullets.text,
      })
      .from(achievementBullets)
      .where(
        and(
          eq(achievementBullets.userId, user.id),
          eq(achievementBullets.visibility, "public"),
          eq(achievementBullets.verificationStatus, "verified")
        )
      );

    const bulletsByEntry = new Map<string, typeof bullets>();
    for (const b of bullets) {
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(b);
      bulletsByEntry.set(b.entryId, list);
    }

    const publicPortfolio = entries.map((e) => ({
      ...e,
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    return successResponse({
      user: candidateProfile,
      portfolio: publicPortfolio,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
