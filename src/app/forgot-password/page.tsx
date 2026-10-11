import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { hasSupabaseConfig } from "@/lib/env";
import { DayFlowLogo } from "@/components/brand/dayflow-logo";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  if (!hasSupabaseConfig()) redirect("/setup");

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <DayFlowLogo className="auth-brand" />
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Reset your password.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Enter your email and we’ll send a secure reset link.
      </p>
      <ForgotPasswordForm />
    </main>
  );
}
