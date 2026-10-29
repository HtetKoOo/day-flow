"use client";
import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { signIn } from "@/app/login/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { message: "" });
  const [submittedMode, setSubmittedMode] = useState<"login" | "signup">(
    "login",
  );

  function trackSubmission(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    setSubmittedMode(submitter?.value === "signup" ? "signup" : "login");
  }

  return (
    <form action={action} className="mt-8 space-y-5" onSubmit={trackSubmission}>
      <GoogleSignInButton disabled={pending} />
      <p className="text-sm text-muted-foreground">
        Signed up with Google? Use Continue with Google unless you have also set
        a DayFlow password.
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or continue with email
      </div>
      <label className="block space-y-2">
        <span>Email</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block space-y-2">
        <span>Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          required
          aria-describedby="password-hint"
        />
        <span
          id="password-hint"
          className="block text-xs text-muted-foreground"
        >
          Creating an account? Use at least 8 characters. Your Google password
          is not your DayFlow password.
        </span>
      </label>
      {state.message && !pending && (
        <p
          role={state.kind === "error" ? "alert" : "status"}
          className={
            state.kind === "error"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg border border-border p-3 text-sm text-foreground"
          }
        >
          {state.message}
        </p>
      )}
      <Button className="w-full" name="mode" value="login" disabled={pending}>
        {pending && submittedMode === "login" ? "Signing in…" : "Sign in"}
      </Button>
      <Link
        className="block text-center text-sm text-primary underline-offset-4 hover:underline"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
      <Button
        className="w-full"
        variant="outline"
        name="mode"
        value="signup"
        disabled={pending}
      >
        {pending && submittedMode === "signup"
          ? "Creating account…"
          : "Create account"}
      </Button>
    </form>
  );
}
