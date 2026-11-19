import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, request) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  // Hard-fail if development auth bypass is enabled in production
  if (isProduction && process.env.ENABLE_DEV_AUTH_BYPASS === "true") {
    throw new Error("CRITICAL SECURITY VIOLATION: ENABLE_DEV_AUTH_BYPASS is prohibited in production.");
  }

  // Dev bypass is only permitted in test/dev environments
  const devBypassActive = !isProduction && (isTest || process.env.ENABLE_DEV_AUTH_BYPASS === "true");

  if (!isPublicRoute(request) && !devBypassActive) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
