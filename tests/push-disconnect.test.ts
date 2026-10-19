import assert from "node:assert/strict";
import test from "node:test";
import { disconnectDeviceSubscription } from "../src/lib/notifications/disconnect";

test("Disconnect removes the specific endpoint before unsubscribing the browser", async () => {
  const operations: string[] = [];
  await disconnectDeviceSubscription(
    {
      endpoint: "this-device",
      unsubscribe: async () => {
        operations.push("unsubscribe");
        return true;
      },
    },
    async (endpoint) => {
      operations.push(`delete:${endpoint}`);
    },
    async () => true,
  );
  assert.deepEqual(operations, ["delete:this-device", "unsubscribe"]);
});
test("Database failure keeps the browser subscription available for retry", async () => {
  let unsubscribed = false;
  await assert.rejects(
    () =>
      disconnectDeviceSubscription(
        {
          endpoint: "device",
          unsubscribe: async () => {
            unsubscribed = true;
            return true;
          },
        },
        async () => {
          throw new Error("database offline");
        },
        async () => true,
      ),
    /database offline/,
  );
  assert.equal(unsubscribed, false);
});
test("Failed browser unsubscribe is reported unless the subscription is already gone", async () => {
  const subscription = { endpoint: "device", unsubscribe: async () => false };
  await assert.rejects(
    () =>
      disconnectDeviceSubscription(
        subscription,
        async () => {},
        async () => true,
      ),
    /Could not disconnect/,
  );
  await disconnectDeviceSubscription(
    subscription,
    async () => {},
    async () => false,
  );
});
