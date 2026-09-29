"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordSecurity() {
  const [state, action, pending] = useActionState(changePassword, {
    message: "",
  });

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <h2 className="font-medium">Password & security</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirm your current password before choosing a new one.
      </p>
      <form action={action} className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm">Current password</span>
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm">New password</span>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm">Confirm new password</span>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <Button disabled={pending}>
          {pending ? "Updating password…" : "Update password"}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      </form>
      <Link
        className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
    </section>
  );
}
