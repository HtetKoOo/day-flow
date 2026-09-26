"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { message: string };

export async function updatePassword(
  _: ResetPasswordState,
  form: FormData,
): Promise<ResetPasswordState> {
  const input = z
    .object({
      password: z.string().min(8).max(128),
      confirmPassword: z.string(),
    })
    .safeParse(Object.fromEntries(form));

  if (!input.success || input.data.password !== input.data.confirmPassword) {
    return { message: "Use a matching password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { message: "This reset link is invalid or expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) return { message: "Unable to update your password. Request a new link and try again." };

  redirect("/planner");
}
