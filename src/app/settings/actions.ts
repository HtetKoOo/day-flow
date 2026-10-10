"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";

export type PasswordSecurityState = { message: string };

export async function changePassword(
  _: PasswordSecurityState,
  form: FormData,
): Promise<PasswordSecurityState> {
  void _;
  const input = z
    .object({
      currentPassword: z.string().min(8).max(128),
      password: z.string().min(8).max(128),
      confirmPassword: z.string(),
    })
    .safeParse(Object.fromEntries(form));

  if (!input.success || input.data.password !== input.data.confirmPassword) {
    return {
      message: "Use matching new passwords with at least 8 characters.",
    };
  }

  const { supabase, user } = await requireUser();
  if (!user.email)
    return { message: "Your account does not have an email address." };

  const { error: currentPasswordError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.data.currentPassword,
    });
  if (currentPasswordError)
    return { message: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({
    password: input.data.password,
  });
  if (error)
    return { message: "Unable to change your password. Please try again." };

  return { message: "Password updated." };
}

export async function revokeTimetableShare(token: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(token).success)
    return { ok: false, message: "Invalid share link." };
  const { error } = await supabase
    .from("timetable_shares")
    .delete()
    .eq("token", token)
    .eq("owner_id", user.id);
  return error
    ? { ok: false, message: "Could not stop sharing. Try again." }
    : { ok: true, message: "Share link stopped." };
}

export async function updateDisplayName(
  _: PasswordSecurityState,
  form: FormData,
): Promise<PasswordSecurityState> {
  void _;
  const parsed = z
    .object({
      displayName: z.string().trim().max(100),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: "Use a display name with up to 100 characters." };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);
  return error
    ? { message: "Could not save your display name. Try again." }
    : {
        message: parsed.data.displayName
          ? "Display name saved."
          : "Display name cleared.",
      };
}
