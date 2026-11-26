import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users, bankEntries, achievementBullets, careerGraphEdges } from "@/lib/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api/response";
import { SettingsService } from "@/lib/services/settingsService";
import { buildDomainGroupedSkillBadges } from "@/lib/services/portfolioSkillGrouping";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const isPreview = req.nextUrl.searchParams.get("preview") === "1";
  const themeOverride = req.nextUrl.searchParams.get("theme");

  try {
    const userRecords = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        headline: users.headline,
        location: users.location,
        githubUrl: users.githubUrl,
        linkedinUrl: users.linkedinUrl,
        portfolioUrl: users.portfolioUrl,
        portfolioViews: users.portfolioViews,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.username, username.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (userRecords.length === 0) {
      return errorResponse("NOT_FOUND", "Public profile not found", 404);
    }

    const user = userRecords[0];
    const ownerSettings = await SettingsService.getUserSettings(user.id);
    const activeTheme =
      themeOverride && ["editorial", "modern", "minimal"].includes(themeOverride)
        ? themeOverride
        : ownerSettings.portfolioTheme;

    let portfolioViews = user.portfolioViews ?? 0;
    if (!isPreview) {
      try {
        const [updated] = await db
          .update(users)
          .set({ portfolioViews: sql`${users.portfolioViews} + 1` })
          .where(eq(users.id, user.id))
          .returning({ portfolioViews: users.portfolioViews });
        if (updated) {
          portfolioViews = updated.portfolioViews;
        }
      } catch {
        // Safe fallback if migration pending
      }
    }

    const [profileEntries, entries, bullets, graphEdges] = await Promise.all([
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
      db
        .select({
          relationshipType: careerGraphEdges.relationshipType,
          targetType: careerGraphEdges.targetType,
          targetId: careerGraphEdges.targetId,
          metadataJson: careerGraphEdges.metadataJson,
        })
        .from(careerGraphEdges)
        .where(eq(careerGraphEdges.userId, user.id))
        .limit(500),
    ]);

    const profileEntry = profileEntries[0];
    const candidateProfile = {
      id: user.id,
      username: user.username,
      fullName: profileEntry?.title || user.displayName || user.username,
      headline: profileEntry?.organization || user.headline || "Professional",
      location: profileEntry?.location || user.location || undefined,
      bio: profileEntry?.descriptionContext || undefined,
      githubUrl: user.githubUrl || undefined,
      linkedinUrl: user.linkedinUrl || undefined,
      portfolioUrl: user.portfolioUrl || undefined,
      portfolioViews: ownerSettings.showViewCounters ? portfolioViews : undefined,
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

    const skillGroupEntries = publicPortfolio.filter((p) => p.entryType === "skill_group");
    const domainSkillBadges = buildDomainGroupedSkillBadges({
      graphEdges,
      skillEntries: skillGroupEntries,
    });

    return successResponse({
      user: candidateProfile,
      theme: activeTheme,
      showViewCounters: ownerSettings.showViewCounters,
      portfolio: publicPortfolio,
      domainSkillBadges,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err.message, 500);
  }
}
