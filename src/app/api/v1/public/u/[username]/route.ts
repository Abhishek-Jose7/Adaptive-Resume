import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users, bankEntries, achievementBullets } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
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
      .where(and(eq(users.username, username), isNull(users.deletedAt)))
      .limit(1);

    if (userRecords.length === 0) {
      return errorResponse("NOT_FOUND", "Public profile not found", 404);
    }

    const user = userRecords[0];

    const [profileEntries, entries, bullets] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(
          and(
            eq(bankEntries.userId, user.id),
            eq(bankEntries.entryType, "profile"),
            inArray(bankEntries.visibility, ["public_eligible", "public"]),
            isNull(bankEntries.deletedAt)
          )
        )
        .limit(1),
      db
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
        .where(
          and(
            eq(bankEntries.userId, user.id),
            inArray(bankEntries.visibility, ["public_eligible", "public"]),
            isNull(bankEntries.deletedAt)
          )
        )
        .limit(100),
      db
        .select({
          id: achievementBullets.id,
          entryId: achievementBullets.entryId,
          text: achievementBullets.text,
        })
        .from(achievementBullets)
        .where(
          and(
            eq(achievementBullets.userId, user.id),
            inArray(achievementBullets.visibility, ["public_eligible", "public"]),
            inArray(achievementBullets.verificationStatus, ["user_verified", "source_verified", "verified"]),
            isNull(achievementBullets.deletedAt)
          )
        )
        .limit(300),
    ]);

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
