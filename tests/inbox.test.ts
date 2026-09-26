import test from "node:test";
import assert from "node:assert/strict";
import { inboxInput, completionInput } from "../src/lib/validation/inbox";

test("Inbox accepts form duration and strips ownership/scheduling fields", () => {
  const parsed = inboxInput.parse({
    title: "  Read chapter 1  ",
    notes: "Pages 1–20",
    duration_minutes: "45",
    user_id: "another-user",
    scheduled_date: "2026-09-25",
    is_completed: true,
  });
  assert.deepEqual(parsed, {
    title: "Read chapter 1",
    notes: "Pages 1–20",
    duration_minutes: 45,
  });
});
test("Inbox rejects invalid input before database writes", () => {
  const base = { title: "Study", notes: "", duration_minutes: 30 };
  for (const patch of [
    { title: "   " },
    { title: "x".repeat(201) },
    { notes: "x".repeat(10001) },
    { duration_minutes: "" },
    { duration_minutes: 4 },
    { duration_minutes: 1441 },
    { duration_minutes: 5.5 },
  ])
    assert.equal(inboxInput.safeParse({ ...base, ...patch }).success, false);
});
test("Completion requires a valid task id and explicit boolean", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.ok(completionInput.safeParse({ id, completed: false }).success);
  assert.equal(
    completionInput.safeParse({ id, completed: "false" }).success,
    false,
  );
  assert.equal(
    completionInput.safeParse({ id: "invalid", completed: true }).success,
    false,
  );
});
