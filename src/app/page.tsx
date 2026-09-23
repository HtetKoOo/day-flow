import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!hasSupabaseConfig()) redirect("/setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/planner" : "/login");
}
