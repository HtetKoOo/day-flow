"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { message: "" });
  return (
    <form action={action} className="mt-8 space-y-5">
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
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <Button className="w-full" name="mode" value="login" disabled={pending}>
        {pending ? "Please wait…" : "Sign in"}
      </Button>
      <Link className="block text-center text-sm text-primary underline-offset-4 hover:underline" href="/forgot-password">
        Forgot password?
      </Link>
      <Button
        className="w-full"
        variant="outline"
        name="mode"
        value="signup"
        disabled={pending}
      >
        Create account
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    </form>
  );
}
