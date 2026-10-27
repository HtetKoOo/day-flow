import test from "node:test";
import assert from "node:assert/strict";
import { createAuthExitCoordinator } from "../src/lib/auth/exit-coordinator";

test("an intentional logout owns navigation until cancellation or unmount", async () => {
  const tab = createAuthExitCoordinator();
  assert.equal(tab.isActive(), false);
  const release = tab.begin();
  const slowAuthResponse = Promise.resolve({ user: null });
  await slowAuthResponse;
  assert.equal(
    tab.isActive(),
    true,
    "in-flight guard response must not redirect over the intentional action",
  );
  release();
  release();
  assert.equal(
    tab.isActive(),
    false,
    "a failed action or unmount restores normal session checking",
  );
});
test("navigation ownership is independent per tab and releases only its own attempt", () => {
  const first = createAuthExitCoordinator(),
    other = createAuthExitCoordinator();
  const one = first.begin(),
    two = first.begin();
  assert.equal(
    other.isActive(),
    false,
    "other devices/tabs still detect deletion",
  );
  one();
  assert.equal(first.isActive(), true);
  two();
  assert.equal(first.isActive(), false);
});
