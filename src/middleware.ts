import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/s/(.*)",
  "/u/(.*)",
  "/api/v1/public/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all non-public routes unless DEV_AUTH_BYPASS is active
  if (!isPublicRoute(request) && process.env.ENABLE_DEV_AUTH_BYPASS !== "true") {
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
