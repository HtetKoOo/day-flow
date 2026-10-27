import "server-only";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/env";
import { isProjectAuthCookie } from "./session-status";

export async function clearServerSessionCookies() {
  const jar = await cookies();
  const { url } = supabaseEnv();
  for (const cookie of jar.getAll()) {
    if (isProjectAuthCookie(cookie.name, url)) jar.delete(cookie.name);
  }
}
