import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { hasSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  if (!hasSupabaseConfig()) redirect("/setup");

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <p className="eyebrow">✦ DAYFLOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Choose a new password.
      </h1>
      <p className="mt-4 text-muted-foreground">Use at least 8 characters.</p>
      <ResetPasswordForm />
    </main>
  );
}
