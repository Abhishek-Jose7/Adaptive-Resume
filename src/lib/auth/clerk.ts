import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq, or } from "drizzle-orm";
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
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  // Hard-fail if development auth bypass is enabled in production
  if (isProduction && process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    throw new AuthError(
      "CRITICAL SECURITY VIOLATION: ENABLE_DEV_AUTH_BYPASS is prohibited in production.",
      "FORBIDDEN"
    );
  }

  // Dev Auth Bypass: Strictly permitted only in non-production environments
  if (!isProduction && process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    // Only automated test runners (NODE_ENV === "test") may specify tenant IDs via headers
    let testUserId = process.env.DEV_USER_ID || "usr_dev_personal_test_id";
    let testEmail = process.env.DEV_USER_EMAIL || "abhishekjose780@gmail.com";

    if (isTest && request?.headers) {
      const headerUserId = request.headers.get("x-test-user-id");
      const headerEmail = request.headers.get("x-test-user-email");
      if (headerUserId) testUserId = headerUserId;
      if (headerEmail) testEmail = headerEmail;
    }

    const testSubject = `clerk_sub_${testUserId}`;

    // Upsert app-local user record using core columns only
    const [existing] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(or(eq(users.id, testUserId), eq(users.clerkSubject, testSubject)))
      .limit(1);

    if (!existing) {
      await db
        .insert(users)
        .values({
          id: testUserId,
          clerkSubject: testSubject,
          username: testUserId.replace(/[^a-z0-9-]/gi, "").toLowerCase(),
          displayName: "Developer User",
          email: testEmail,
        })
        .onConflictDoNothing();
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

  // Check app-local DB first using the signed session cookie's userId so we skip external Clerk API round-trips on returning requests
  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      clerkSubject: users.clerkSubject,
    })
    .from(users)
    .where(eq(users.clerkSubject, session.userId))
    .limit(1);

  if (existingUser) {
    if (!isEmailAllowed(existingUser.email)) {
      throw new AuthError(
        "Your account is not authorized during the personal access preview.",
        "FORBIDDEN"
      );
    }
    return {
      userId: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
      clerkSubject: existingUser.clerkSubject,
    };
  }

  // First-time login: fetch full user metadata from Clerk
  const clerkUser = await currentUser();
  const primaryEmailObj =
    clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
    clerkUser?.emailAddresses?.find((e) => e.verification?.status === "verified") ||
    clerkUser?.emailAddresses?.[0];
  const primaryEmail = primaryEmailObj?.emailAddress || null;

  // Enforce Signup Allowlist for personal MVP
  if (!isEmailAllowed(primaryEmail)) {
    throw new AuthError(
      "Your account is not authorized during the personal access preview.",
      "FORBIDDEN"
    );
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

