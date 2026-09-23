"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type LoginState = { message: string };
export async function signIn(
  _: LoginState,
  form: FormData,
): Promise<LoginState> {
  const input = z
    .object({
      email: z.email(),
      password: z.string().min(8).max(128),
      mode: z.enum(["login", "signup"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      message: "Enter a valid email and a password of at least 8 characters.",
    };
  const supabase = await createClient();
  const { email, password, mode } = input.data;
  const { error } =
    mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return {
      message: "Unable to continue. Check your details or try again later.",
    };
  if (mode === "signup")
    return {
      message: "Check your email to confirm your account, then sign in.",
    };
  redirect("/planner");
}
