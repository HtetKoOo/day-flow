"use server";

import { requireUser } from "@/lib/auth";
import { feedbackSchema } from "@/lib/feedback/validation";
import { notifyFeedback } from "@/lib/feedback/email";
import packageInfo from "../../../package.json";

export type FeedbackState = { ok: boolean; message: string };

export async function submitFeedback(
  _: FeedbackState,
  form: FormData,
): Promise<FeedbackState> {
  const { supabase } = await requireUser();
  const input = feedbackSchema.safeParse({
    kind: form.get("kind"),
    message: form.get("message"),
    replyEmail: String(form.get("replyEmail") ?? "").trim(),
  });
  if (!input.success)
    return {
      ok: false,
      message:
        "Choose a type, write 10–4,000 characters, and check your reply email.",
    };
  const { data, error } = await supabase.rpc("submit_feedback", {
    p_kind: input.data.kind,
    p_message: input.data.message,
    p_reply_email: input.data.replyEmail,
    p_app_version: packageInfo.version,
  });
  if (error || !data)
    return {
      ok: false,
      message: error?.message.includes("FEEDBACK_RATE_LIMIT")
        ? "Please wait a minute before sending again. You can send up to five messages per hour."
        : "Could not send your feedback. Your message is still here. Please try again.",
    };
  // Persist first: an email outage must never lose a user's feedback.
  await notifyFeedback(data as string, input.data, packageInfo.version);
  return { ok: true, message: "Thanks! Your feedback has been received." };
}
