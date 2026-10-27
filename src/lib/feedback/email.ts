import "server-only";
import type { z } from "zod";
import type { feedbackSchema } from "./validation";

export async function notifyFeedback(
  id: string,
  input: z.infer<typeof feedbackSchema>,
  version: string,
) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  if (!key || !to || !from) {
    console.error("Feedback email configuration missing", { feedbackId: id });
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `feedback/${id}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `DayFlow: ${input.kind} (${version})`,
        ...(input.replyEmail ? { reply_to: input.replyEmail } : {}),
        text: `Type: ${input.kind}\nReply email: ${input.replyEmail || "Not provided"}\nVersion: ${version}\nReference: ${id}\n\n${input.message}`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      console.error("Feedback email failed", {
        feedbackId: id,
        status: response.status,
      });
  } catch {
    console.error("Feedback email unavailable", { feedbackId: id });
  }
}
