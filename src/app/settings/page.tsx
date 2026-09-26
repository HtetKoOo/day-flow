import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/theme-picker";
import { PasswordSecurity } from "@/components/auth/password-security";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const { user } = await requireUser();
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
      <PasswordSecurity />
      <section className="mt-6 rounded-3xl border bg-card p-6">
        <h2 className="mb-4 font-medium">Appearance</h2>
        <ThemePicker />
        <p className="mt-3 text-sm text-muted-foreground">
          Saved on this device. System follows your device appearance.
        </p>
      </section>
      <p className="mt-6 text-sm text-muted-foreground">
        Planner preferences and account deletion are planned for the next V1
        implementation phase.
      </p>
    </main>
  );
}
