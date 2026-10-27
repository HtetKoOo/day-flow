"use server";
import { clearServerSessionCookies } from "@/lib/auth/clear-server-session";
import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function signOut() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // A deleted/revoked account or Auth outage cannot prevent local logout.
  }
  await clearServerSessionCookies();
  redirect("/login");
}

export async function clearEndedSession() {
  await clearServerSessionCookies();
  redirect("/login?session=ended", RedirectType.replace);
}
