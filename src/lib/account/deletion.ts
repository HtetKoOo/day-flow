import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

export function deletionEmailConfigured() {
  return Boolean(
    process.env.SUPABASE_SECRET_KEY &&
    process.env.RESEND_API_KEY &&
    process.env.FEEDBACK_FROM_EMAIL,
  );
}

export function deletionAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Account deletion is not configured");
  return createClient(supabaseEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sendDeletionCode(
  email: string,
  code: string,
  requestId: string,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `account-deletion/${requestId}`,
    },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM_EMAIL,
      to: [email],
      subject: "Confirm your DayFlow account deletion",
      text: `Your DayFlow account deletion code is: ${code}\n\nThis code expires in 10 minutes and only authorizes deletion from the browser session that requested it. Enter it in DayFlow and confirm only if you want to permanently delete your account.\n\nIf you did not request this, do not share the code. Your account has not been deleted.`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}
