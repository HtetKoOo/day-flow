import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/theme-picker";
import { PasswordSecurity } from "@/components/auth/password-security";
import { ShareLinkManager } from "@/components/settings/share-link-manager";
import { DisplayNameForm } from "@/components/settings/display-name-form";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const { user, supabase } = await requireUser();
  const [{ data: shares }, { data: profile }] = await Promise.all([
    supabase
      .from("timetable_shares")
      .select("token,starts_on,ends_on,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Link href="/planner" className="text-sm underline">
        ← Planner
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">Settings</h1>
      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="font-medium">Account</h2>
        <p className="my-4 text-muted-foreground">{user.email}</p>
        <form action={signOut}>
          <Button variant="outline">Sign out</Button>
        </form>
      </section>
      <DisplayNameForm defaultValue={profile?.display_name ?? ""} />
      <PasswordSecurity />
      <ShareLinkManager shares={shares ?? []} />
      <section className="mt-6 rounded-3xl border bg-card p-6">
        <h2 className="mb-4 font-medium">Appearance</h2>
        <ThemePicker />
        <p className="mt-3 text-sm text-muted-foreground">
          Saved on this device. System follows your device appearance.
        </p>
      </section>
    </main>
  );
}
