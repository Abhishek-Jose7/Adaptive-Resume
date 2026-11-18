import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { isEmailAllowed } from "./allowlist";

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  username: string | null;
  clerkSubject: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" = "UNAUTHENTICATED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Validates the caller's identity and returns the tenant-scoped user.
 * Guarantees that an app-local `users` record exists for the Clerk subject.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthenticatedUser> {
  // Check for Dev Auth Bypass (local tests & headless CI)
  if (process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    // Optional request header override for multi-tenant tests: X-Test-User-Id
    const testUserId = request?.headers.get("x-test-user-id") || process.env.DEV_USER_ID || "usr_dev_personal_test_id";
    const testEmail = request?.headers.get("x-test-user-email") || process.env.DEV_USER_EMAIL || "abhishekjose780@gmail.com";
    const testSubject = `clerk_sub_${testUserId}`;

    // Upsert app-local user record
    const [existing] = await db.select().from(users).where(eq(users.clerkSubject, testSubject)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        id: testUserId,
        clerkSubject: testSubject,
        username: testUserId.replace(/[^a-z0-9-]/gi, "").toLowerCase(),
        displayName: "Developer User",
        email: testEmail,
      });
    }

    return {
      userId: existing ? existing.id : testUserId,
      email: testEmail,
      username: existing?.username || "devuser",
      clerkSubject: testSubject,
    };
  }

  // Standard Clerk Authentication
  let session;
  try {
    session = await auth();
  } catch (err) {
    throw new AuthError("Failed to verify authentication session", "UNAUTHENTICATED");
  }

  if (!session || !session.userId) {
    throw new AuthError("Authentication required", "UNAUTHENTICATED");
  }

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || null;

  // Enforce Signup Allowlist for personal MVP
  if (!isEmailAllowed(primaryEmail)) {
    throw new AuthError(
      "Your account is not authorized during the personal access preview.",
      "FORBIDDEN"
    );
  }

  // Sync to app-local users table
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkSubject, session.userId))
    .limit(1);

  if (existingUser) {
    return {
      userId: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
      clerkSubject: existingUser.clerkSubject,
    };
  }

  // Create new app-local user record
  const newUserId = `usr_${crypto.randomUUID()}`;
  const preferredUsername = clerkUser?.username || `user-${newUserId.slice(-6)}`;

  await db.insert(users).values({
    id: newUserId,
    clerkSubject: session.userId,
    username: preferredUsername,
    displayName: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() || null,
    email: primaryEmail,
  });

  return {
    userId: newUserId,
    email: primaryEmail,
    username: preferredUsername,
    clerkSubject: session.userId,
  };
}

export async function getAuthUserId(request?: Request): Promise<string> {
  const user = await getAuthenticatedUser(request);
  return user.userId;
}

