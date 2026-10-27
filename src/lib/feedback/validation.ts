import { z } from "zod";

export const feedbackSchema = z.object({
  kind: z.enum(["feedback", "bug", "feature"]),
  message: z.string().trim().min(10).max(4000),
  replyEmail: z.union([z.literal(""), z.email().max(254)]),
});
