import test from "node:test";
import assert from "node:assert/strict";
import {
  sessionHasEnded,
  isProjectAuthCookie,
} from "../src/lib/auth/session-status";

test("deleted, revoked, and missing sessions are terminal even with an unexpired JWT", () => {
  assert.equal(sessionHasEnded(null, true), false);
  assert.equal(sessionHasEnded(null, false), true);
  for (const error of [
    { status: 401 },
    { status: 403 },
    { status: 404, code: "user_not_found" },
    { name: "AuthSessionMissingError" },
    { code: "session_not_found" },
    { code: "refresh_token_not_found" },
    { code: "refresh_token_already_used" },
    { code: "bad_jwt" },
  ]) {
    assert.equal(sessionHasEnded(error, false), true);
  }
});

test("offline, provider outages, rate limits and unknown auth failures must not log out a user", () => {
  for (const error of [
    { name: "AuthRetryableFetchError", status: 0 },
    { status: 429 },
    { status: 500 },
    { status: 503 },
    { name: "TypeError" },
  ]) {
    assert.equal(sessionHasEnded(error, false), false);
  }
});

test("logout clears only this Supabase project's auth cookies including chunks", () => {
  const url = "https://dayflow-project.supabase.co";
  for (const name of [
    "sb-dayflow-project-auth-token",
    "sb-dayflow-project-auth-token.0",
    "sb-dayflow-project-auth-token.1",
    "sb-dayflow-project-auth-token-code-verifier",
  ])
    assert.equal(isProjectAuthCookie(name, url), true);
  for (const name of [
    "sb-another-project-auth-token",
    "sb-dayflow-project-auth-token-extra",
    "theme",
    "another-app-session",
  ])
    assert.equal(isProjectAuthCookie(name, url), false);
});
