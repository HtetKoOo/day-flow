"use server";

import { randomInt, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import {
  deletionAdmin,
  deletionEmailConfigured,
  sendDeletionCode,
} from "@/lib/account/deletion";
import { createClient } from "@/lib/supabase/server";

export async function requestAccountDeletionCode(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!deletionEmailConfigured())
    return {
      ok: false,
      message:
        "Account verification email is not configured yet. Please contact support.",
    };
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  const session = claims?.claims?.session_id;
  if (
    error ||
    !user ||
    !user.email_confirmed_at ||
    claims?.claims?.sub !== user.id ||
    !z.uuid().safeParse(session).success
  )
    return {
      ok: false,
      message: "Please sign in with a verified email before continuing.",
    };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const requestId = randomUUID();
  const hash = createHash("sha256")
    .update(`${requestId}:${code}`)
    .digest("hex");
  try {
    const admin = deletionAdmin();
    const { data, error: challengeError } = await admin.rpc(
      "begin_account_deletion_challenge",
      {
        p_user: user.id,
        p_session: session,
        p_hash: hash,
        p_request: requestId,
      },
    );
    if (challengeError || !data?.ok)
      return {
        ok: false,
        message:
          data?.reason === "cooldown"
            ? "Wait 60 seconds before requesting another code."
            : data?.reason === "rate_limit"
              ? "You can request up to five codes per hour. Please try later."
              : "Could not prepare verification. Please sign in again or contact support.",
      };
    const sent = await sendDeletionCode(data.email, code, requestId);
    if (!sent)
      return {
        ok: false,
        message:
          "Could not send the code. Wait 60 seconds, then try again. Your account has not been deleted.",
      };
    const { error: activationError, data: activated } = await admin
      .from("account_deletion_challenges")
      .update({ sent: true })
      .eq("user_id", user.id)
      .eq("request_id", requestId)
      .select("request_id");
    if (activationError || activated?.length !== 1)
      return {
        ok: false,
        message:
          "Could not activate this code. Request a new code after 60 seconds.",
      };
    return {
      ok: true,
      message:
        "A verification code was sent to your account email. It expires in 10 minutes.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Verification email is unavailable. Wait 60 seconds before retrying. Your account has not been deleted.",
    };
  }
}

export async function deleteOwnAccount(
  confirmation: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  if (confirmation !== "DELETE")
    return { ok: false, message: "Type DELETE to confirm." };
  if (!/^\d{6}$/.test(code))
    return { ok: false, message: "Enter the six-digit verification code." };
  const supabase = await createClient();
  // Verify the user with Auth, not just a cached access-token claim.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return {
      ok: false,
      message: "Please sign in again before deleting your account.",
    };
  const { error, data } = await supabase.rpc("delete_own_account", {
    p_confirmation: confirmation,
    p_code: code,
  });
  if (error || data?.ok !== true) {
    const messages: Record<string, string> = {
      session: "Please sign in again before continuing.",
      confirmation: "Type DELETE to confirm.",
      request_code:
        "Request a new verification code from this browser session.",
      expired: "This code has expired. Request a new code.",
      attempts:
        "Too many incorrect attempts. Request a new code after the cooldown.",
      invalid_code:
        "The verification code is incorrect. Check the latest email and try again.",
    };
    return {
      ok: false,
      message:
        messages[data?.reason] ??
        "Could not confirm account deletion. Check your connection and account before trying again, or contact support.",
    };
  }
  // Auth deletion invalidates refresh sessions. Clear this browser's cookies too.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Deletion has committed. Client cleanup will also attempt local sign-out.
    console.error("Post-deletion session cleanup unavailable");
  }
  return { ok: true, message: "Your account has been deleted." };
}
