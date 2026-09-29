import "server-only";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
export async function requireUser() {
  if (!hasSupabaseConfig()) redirect("/setup");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || typeof claims.sub !== "string") redirect("/login");
  const email = claims.email;
  return {
    supabase,
    user: {
      id: claims.sub,
      email: typeof email === "string" ? email : undefined,
    },
  };
}
