import { InstallSettings } from "@/components/pwa/install-settings";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { ThemePicker } from "@/components/theme-picker";
import { PasswordSecurity } from "@/components/auth/password-security";
import { ShareLinkManager } from "@/components/settings/share-link-manager";
import { DisplayNameForm } from "@/components/settings/display-name-form";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { PushNotificationSettings } from "@/components/settings/push-notification-settings";
import { SettingsShell } from "@/components/settings/settings-shell";
import { SignOutConfirmation } from "@/components/settings/sign-out-confirmation";

export const dynamic = "force-dynamic";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const { user, supabase } = await requireUser();
  const [{ data: shares }, { data: profile }] = await Promise.all([
    supabase
      .from("timetable_shares")
      .select("token,starts_on,ends_on,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name,timezone")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <SettingsShell
      defaultSection={section}
      sections={{
        profile: (
          <>
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="font-medium">Account</h2>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {user.email}
              </p>
            </section>
            <DisplayNameForm defaultValue={profile?.display_name ?? ""} />
            <section className="mt-6 rounded-3xl border bg-card p-6">
              <h2 className="font-medium">Sign out</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign out from this device.
              </p>
              <div className="mt-5">
                <SignOutConfirmation action={signOut} />
              </div>
            </section>
          </>
        ),
        planning: (
          <>
            <TimezoneForm defaultValue={profile?.timezone ?? "UTC"} />
            <PushNotificationSettings />
          </>
        ),
        sharing: <ShareLinkManager shares={shares ?? []} />,
        appearance: (
          <section className="rounded-3xl border bg-card p-6">
            <h2 className="font-medium">Appearance</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose how DayFlow looks on this device.
            </p>
            <div className="mt-5">
              <ThemePicker />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              System follows your device appearance.
            </p>
          </section>
        ),
        app: <InstallSettings />,
        security: <PasswordSecurity />,
      }}
    />
  );
}
