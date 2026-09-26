"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { message: "" });

  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block space-y-2">
        <span>Email</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <Button className="w-full" disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
      <Link className="block text-center text-sm text-primary underline-offset-4 hover:underline" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
