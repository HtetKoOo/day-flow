type AuthFailure = { code?: string; status?: number; name?: string };

/** Only definite invalid-session responses should clear local state.
 * Offline, rate-limit and provider failures are retryable, not logout signals. */
export function sessionHasEnded(error: AuthFailure | null, hasUser: boolean) {
  if (!error) return !hasUser;
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.name === "AuthSessionMissingError" ||
    [
      "user_not_found",
      "session_not_found",
      "session_expired",
      "refresh_token_not_found",
      "refresh_token_already_used",
      "bad_jwt",
    ].includes(error.code ?? "")
  );
}

export function isProjectAuthCookie(name: string, supabaseUrl: string) {
  const prefix = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  return (
    name === prefix ||
    name.startsWith(`${prefix}.`) ||
    name === `${prefix}-code-verifier`
  );
}
