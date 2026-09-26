"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, { message: "" });

  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block space-y-2">
        <span>New password</span>
        <Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </label>
      <label className="block space-y-2">
        <span>Confirm new password</span>
        <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </label>
      <Button className="w-full" disabled={pending}>
        {pending ? "Updating password…" : "Update password"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    </form>
  );
}
