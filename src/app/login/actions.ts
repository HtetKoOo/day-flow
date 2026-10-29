"use server";
import { loginInput, loginErrorMessage } from "@/lib/auth/login";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type LoginState = { message: string; kind?: "error" | "success" };
export async function signIn(
  _: LoginState,
  form: FormData,
): Promise<LoginState> {
  const input = loginInput.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      kind: "error",
      message:
        input.error.issues[0]?.message ?? "Check your details and try again.",
    };
  const supabase = await createClient();
  const { email, password, mode } = input.data;
  const origin = (await headers()).get("origin");
  const { error } =
    mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: origin
            ? { emailRedirectTo: `${origin}/auth/confirm` }
            : undefined,
        })
      : await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return {
      kind: "error",
      message: loginErrorMessage(error, mode),
    };
  if (mode === "signup")
    return {
      kind: "success",
      message:
        "If confirmation is needed, check your email for a link. Already registered? Sign in or continue with Google.",
    };
  redirect("/planner");
}
