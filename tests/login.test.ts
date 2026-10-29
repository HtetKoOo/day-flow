import assert from "node:assert/strict";
import test from "node:test";
import { loginInput, loginErrorMessage } from "../src/lib/auth/login";

test("login accepts existing short passwords while signup enforces eight characters", () => {
  const input = {
    email: "person@example.com",
    password: "short",
    mode: "login",
  };
  assert.equal(loginInput.safeParse(input).success, true);
  assert.equal(
    loginInput.parse({ ...input, email: " person@example.com " }).email,
    "person@example.com",
  );
  assert.equal(
    loginInput.safeParse({ ...input, mode: "signup" }).success,
    false,
  );
  assert.equal(loginInput.safeParse({ ...input, password: "" }).success, false);
  assert.equal(
    loginInput.safeParse({ ...input, email: "invalid" }).success,
    false,
  );
});

test("invalid credentials give recovery and Google guidance without asserting account provider", () => {
  const message = loginErrorMessage(
    { code: "invalid_credentials", status: 400 },
    "login",
  );
  assert.match(message, /Email or password is incorrect/);
  assert.match(message, /If you signed up with Google/);
  assert.match(message, /Forgot password/);
});

test("confirmation, rate limits, unavailable service and fallback have distinct guidance", () => {
  assert.match(
    loginErrorMessage({ code: "email_not_confirmed" }, "login"),
    /Confirm your email/,
  );
  assert.match(
    loginErrorMessage({ status: 429 }, "login"),
    /Too many attempts/,
  );
  assert.match(
    loginErrorMessage({ code: "over_email_send_rate_limit" }, "signup"),
    /Too many attempts/,
  );
  assert.match(loginErrorMessage({ status: 503 }, "login"), /connection/);
  assert.match(
    loginErrorMessage({ name: "AuthRetryableFetchError" }, "login"),
    /connection/,
  );
  assert.match(
    loginErrorMessage({ code: "weak_password" }, "signup"),
    /stronger password/,
  );
  assert.match(
    loginErrorMessage({ code: "email_provider_disabled" }, "login"),
    /Continue with Google/,
  );
  assert.match(loginErrorMessage({}, "signup"), /create your account/);
  assert.match(loginErrorMessage({}, "login"), /sign in/);
});
