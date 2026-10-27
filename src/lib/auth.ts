import "server-only";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
export async function requireUser() {
  if (!hasSupabaseConfig()) redirect("/setup");
  const supabase = await createClient();
  // A valid JWT signature alone does not prove the account still exists.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user: { id: user.id, email: user.email } };
}
