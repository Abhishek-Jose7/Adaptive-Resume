import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/s/(.*)",
  "/u/(.*)",
  "/api/v1/public/(.*)",
]);

const clerkAuth = clerkMiddleware(async (auth, request) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  // Hard-fail if development auth bypass is enabled in production
  if (isProduction && process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    return new NextResponse(
      "Configuration Error: ENABLE_DEV_AUTH_BYPASS is prohibited in production. Please remove this variable from your Vercel Project Settings.",
      { status: 500 }
    );
  }

  // Dev bypass is only permitted in test/dev environments
  const devBypassActive = !isProduction && (isTest || process.env.ENABLE_DEV_AUTH_BYPASS === "true");

  if (!isPublicRoute(request) && !devBypassActive) {
    await auth.protect();
  }
});

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    return new NextResponse(
      "Configuration Error: ENABLE_DEV_AUTH_BYPASS is prohibited in production. Please remove this variable from your Vercel Project Settings > Environment Variables.",
      { status: 500 }
    );
  }

  const hasPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY
  );
  const hasSecretKey = Boolean(process.env.CLERK_SECRET_KEY);

  if (!hasPublishableKey || !hasSecretKey) {
    console.error(
      "[Clerk Middleware] Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY in environment variables."
    );
    if (isPublicRoute(request)) {
      return NextResponse.next();
    }
    return new NextResponse(
      "Missing Clerk Configuration: Please ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are configured in your Vercel Project Settings > Environment Variables.",
      { status: 503 }
    );
  }

  try {
    return await clerkAuth(request, event);
  } catch (error: any) {
    console.error("[Middleware Invocation Error]:", error);
    if (isPublicRoute(request)) {
      return NextResponse.next();
    }
    return new NextResponse(
      `Middleware Error: ${error?.message || "Internal error during authentication"}`,
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
