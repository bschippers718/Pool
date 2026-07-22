import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseService } from "./supabase";

// Ensures a profiles row exists for the signed-in Clerk user.
// Gateway routes call this before any pool operation.
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthorized");

  const db = supabaseService();
  const { data } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!data) {
    const user = await currentUser();
    const handle =
      user?.username ??
      user?.emailAddresses?.[0]?.emailAddress?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") ??
      `user_${userId.slice(-6)}`;
    await db.from("profiles").upsert({
      id: userId,
      handle,
      display_name: user?.firstName ?? handle,
      avatar_url: user?.imageUrl ?? null,
    });
  }
  return userId;
}
