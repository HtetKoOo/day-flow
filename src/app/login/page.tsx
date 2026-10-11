import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";
import { DayFlowLogo } from "@/components/brand/dayflow-logo";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;
  if (!hasSupabaseConfig()) redirect("/setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (typeof data?.claims?.sub === "string") redirect("/planner");

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <DayFlowLogo className="auth-brand" />
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Plan tomorrow tonight.
      </h1>
      <p className="mt-4 text-muted-foreground">Make space for a calmer day.</p>
      {confirmation === "failed" && (
        <p role="alert" className="mt-5 text-sm">
          This confirmation link is invalid or expired. Try signing in or
          request a new signup email.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
