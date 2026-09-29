"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PasswordResetRequestState = { message: string };

export async function requestPasswordReset(
  _: PasswordResetRequestState,
  form: FormData,
): Promise<PasswordResetRequestState> {
  const input = z
    .object({ email: z.email() })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "Enter a valid email address." };

  const origin = (await headers()).get("origin");
  if (!origin)
    return { message: "Unable to send a reset link. Please try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    input.data.email,
    {
      redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    },
  );

  if (error)
    return { message: "Unable to send a reset link. Please try again." };

  // Keep this response neutral so an address cannot be used to discover accounts.
  return {
    message: "If an account uses that email, a reset link is on its way.",
  };
}
