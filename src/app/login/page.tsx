import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";
import { DayFlowLogo } from "@/components/brand/dayflow-logo";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{
    confirmation?: string;
    account?: string;
    session?: string;
  }>;
}) {
  const { confirmation, account, session } = await searchParams;
  if (!hasSupabaseConfig()) redirect("/setup");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!error && user) redirect("/planner");

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <DayFlowLogo className="auth-brand" />
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Plan tomorrow tonight.
      </h1>
      <p className="mt-4 text-muted-foreground">Make space for a calmer day.</p>
      {confirmation === "failed" && (
        <p role="alert" className="mt-5 text-sm">
          Sign-in or email verification could not be completed. Try Continue
          with Google again, or request a new email link if yours has expired.
        </p>
      )}
      {account === "deleted" && (
        <p role="status" className="mt-5 text-sm">
          Your account has been deleted.
        </p>
      )}
      {session === "ended" && (
        <p role="status" className="mt-5 text-sm">
          Your session has ended or this account is no longer available. Please
          sign in again.
        </p>
      )}
      <LoginForm />
      <div className="mt-6 border-t pt-5 text-center">
        <Link
          href="/demo"
          className="inline-flex min-h-11 w-full flex-wrap items-center justify-center gap-x-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>Try the demo</span>
          <span className="font-normal text-muted-foreground">
            — no account needed
          </span>
        </Link>
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center text-primary hover:underline"
        >
          Privacy policy
        </Link>
      </p>
    </main>
  );
}
