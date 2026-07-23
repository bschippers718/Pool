import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/", // public hero — the page itself redirects signed-in users to /chat
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/m(.*)", // public shared-moment deep links
  "/join(.*)", // invite landing — auth happens when redeeming
  "/api/moments/(.+)", // GET one moment powers the public /m/[id] page
  "/api/pools/join", // route handles its own auth and returns clean 401 JSON
  "/manifest.json",
  "/icon.svg",
  "/opengraph-image(.*)", // OG cards must be crawlable by link unfurlers
  "/twitter-image(.*)",
]);

const demoMode = process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";

const clerk = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// In demo mode we bypass Clerk entirely so the app runs with zero auth env
// vars; importing the middleware factory is still required at module scope.
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (demoMode) return NextResponse.next();
  return clerk(request, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
