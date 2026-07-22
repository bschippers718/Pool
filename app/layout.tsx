import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import ChatFab from "@/components/ChatFab";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pool — split AI like Netflix",
  description: "One shared AI budget for your whole crew — fast, smart & image gen. Every friend you invite drops the price.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Pool" },
};

export const viewport: Viewport = {
  themeColor: "#0B0E0C",
  width: "device-width",
  initialScale: 1,
  // Stops iOS Safari from auto-zooming the page when an input gains focus.
  // (Users can still pinch-zoom manually; iOS ignores this for pinch.)
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const demoMode = process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shell = (
    <div className="app-shell">
      {children}
      <ChatFab />
    </div>
  );
  return (
    <html lang="en">
      <body>{demoMode ? shell : <ClerkProvider appearance={clerkAppearance}>{shell}</ClerkProvider>}</body>
    </html>
  );
}
