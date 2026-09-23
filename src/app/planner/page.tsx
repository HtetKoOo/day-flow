import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PlannerShell } from "@/components/planner/planner-shell";
export const dynamic = "force-dynamic";
export default async function Planner() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  if (error)
    return (
      <main className="p-12">
        <h1 className="text-2xl">Database setup needed</h1>
        <p className="mt-4">
          Apply the DayFlow migration, then reload this page.
        </p>
        <Link href="/settings" className="underline">
          Account settings
        </Link>
      </main>
    );
  return <PlannerShell timezone={profile.timezone} />;
}
