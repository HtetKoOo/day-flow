import { z } from "zod";

export const loginInput = z
  .object({
    email: z.string().trim().pipe(z.email("Enter a valid email address.")),
    password: z
      .string()
      .min(1, "Enter your password.")
      .max(128, "Password is too long."),
    mode: z.enum(["login", "signup"]),
  })
  .superRefine((input, context) => {
    if (input.mode === "signup" && input.password.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Use at least 8 characters to create an account.",
      });
    }
  });

export function loginErrorMessage(
  error: { code?: string; status?: number; name?: string },
  mode: "login" | "signup",
): string {
  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  ) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  switch (error.code) {
    case "invalid_credentials":
      return "Email or password is incorrect. If you signed up with Google, choose Continue with Google. Otherwise, try Forgot password?";
    case "email_not_confirmed":
      return "Confirm your email using the link in your inbox before signing in. Check your spam folder too.";
    case "weak_password":
      return "Choose a stronger password with at least 8 characters, following the password requirements.";
    case "signup_disabled":
      return "New account registration is currently unavailable. Please try again later.";
    case "email_provider_disabled":
      return "Email and password access is currently unavailable. Try Continue with Google.";
    case "user_already_exists":
    case "email_exists":
      return "Unable to create an account with these details. Try signing in, Continue with Google, or Forgot password?";
    case "validation_failed":
    case "email_address_invalid":
      return "Check your email address and password, then try again.";
  }
  if (
    error.name === "AuthRetryableFetchError" ||
    (error.status !== undefined && error.status >= 500)
  ) {
    return "Unable to reach the sign-in service. Check your connection and try again.";
  }
  return mode === "signup"
    ? "Unable to create your account right now. Please try again later."
    : "Unable to sign in right now. Please try again later.";
}
