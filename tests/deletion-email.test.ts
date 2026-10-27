import test from "node:test";
import assert from "node:assert/strict";
import {
  deletionEmailContent,
  deletionRequestReference,
} from "../src/lib/account/deletion-email";

test("deletion email keeps OTP on its own line and matches the dialog request reference", () => {
  const id = "abcdef01-1111-4111-8111-111111111111";
  const message = deletionEmailContent("001234", id);
  assert.equal(deletionRequestReference(id), "ABCDEF01");
  assert.ok(message.subject.includes("ABCDEF01"));
  assert.ok(!message.subject.includes("001234"));
  assert.ok(
    message.text.split("\n").includes("001234"),
    "copying the code preserves leading zeroes",
  );
  assert.ok(message.text.includes("Request reference: ABCDEF01"));
  assert.ok(
    !message.text.includes("\\n"),
    "email must use actual line breaks, not literal backslash-n text",
  );
  assert.notEqual(
    deletionEmailContent("001234", "bbbbbbbb-1111-4111-8111-111111111111")
      .subject,
    message.subject,
    "resends are distinguishable even if the random code repeats",
  );
});
