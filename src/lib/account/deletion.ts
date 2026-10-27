import "server-only";
import { createClient } from "@supabase/supabase-js";
import { deletionEmailContent } from "./deletion-email";
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
      ...deletionEmailContent(code, requestId),
    }),
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}
