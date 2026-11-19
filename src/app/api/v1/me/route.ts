import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/clerk";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "login",
  "logout",
  "me",
  "null",
  "public",
  "root",
  "settings",
  "share",
  "signin",
  "signup",
  "support",
  "system",
  "u",
  "undefined",
]);

const UpdateMeSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  contactEmail: z.union([z.string().email().max(254), z.literal("")]).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(120).optional(),
  headline: z.string().max(160).optional(),
  githubUrl: profileUrlSchema().optional(),
  linkedinUrl: profileUrlSchema().optional(),
  portfolioUrl: profileUrlSchema().optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9-]+$/, "Username can only contain lowercase letters, numbers, and hyphens")
    .optional(),
});

function profileUrlSchema() {
  return z.union([
    z.string().url().max(500).refine((value) => {
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Use a link beginning with http:// or https://"),
    z.literal(""),
  ]);
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const [user] = await db.select().from(users).where(eq(users.id, authUser.userId)).limit(1);

    if (!user) {
      return apiError("NOT_FOUND", "User profile not found", 404);
    }

    return apiSuccess({
      id: user.id,
      clerkSubject: user.clerkSubject,
      username: user.username,
      displayName: user.displayName,
      email: user.contactEmail || user.email,
      contactEmail: user.contactEmail,
      accountEmail: user.email,
      phone: user.phone,
      location: user.location,
      headline: user.headline,
      githubUrl: user.githubUrl,
      linkedinUrl: user.linkedinUrl,
      portfolioUrl: user.portfolioUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = UpdateMeSchema.parse(body);

    if (validated.username) {
      const lowerUsername = validated.username.toLowerCase();

      // Reserved word check (PRD Section 6.1 A5)
      if (RESERVED_USERNAMES.has(lowerUsername)) {
        return apiError("VALIDATION_ERROR", "This username is reserved and cannot be claimed.", 400, {
          username: ["Username is reserved"],
        });
      }

      // Unique check across active users
      const [existing] = await db
        .select()
        .from(users)
        .where(and(eq(users.username, lowerUsername), ne(users.id, authUser.userId)))
        .limit(1);

      if (existing) {
        return apiError("CONFLICT", "Username is already claimed by another user.", 409, {
          username: ["Username is already taken"],
        });
      }
    }

    await db
      .update(users)
      .set({
        displayName: validated.displayName,
        contactEmail: validated.contactEmail === "" ? null : validated.contactEmail?.toLowerCase(),
        phone: validated.phone === "" ? null : validated.phone,
        location: validated.location === "" ? null : validated.location,
        headline: validated.headline === "" ? null : validated.headline,
        githubUrl: validated.githubUrl === "" ? null : validated.githubUrl,
        linkedinUrl: validated.linkedinUrl === "" ? null : validated.linkedinUrl,
        portfolioUrl: validated.portfolioUrl === "" ? null : validated.portfolioUrl,
        username: validated.username ? validated.username.toLowerCase() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.userId));

    const [updated] = await db.select().from(users).where(eq(users.id, authUser.userId)).limit(1);
    return apiSuccess({
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      email: updated.contactEmail || updated.email,
      contactEmail: updated.contactEmail,
      accountEmail: updated.email,
      phone: updated.phone,
      location: updated.location,
      headline: updated.headline,
      githubUrl: updated.githubUrl,
      linkedinUrl: updated.linkedinUrl,
      portfolioUrl: updated.portfolioUrl,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
