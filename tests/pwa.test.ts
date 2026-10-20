import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import manifest from "../src/app/manifest";
import { serviceWorkerSource } from "../src/lib/pwa/worker";
import { readFileSync } from "node:fs";

type WorkerEvent = {
  data?: { type: string };
  waitUntil?: (promise: Promise<unknown>) => void;
  request?: { url: string; method: string; mode: string };
  respondWith?: (value: Promise<Response>) => void;
};

function worker() {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const cached: string[] = [];
  const deleted: string[] = [];
  let activated = 0;
  let online = true;
  const context = {
    BUILD_VERSION: "test",
    Response,
    URL,
    self: {
      location: { origin: "https://dayflow.test" },
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) =>
        handlers.set(name, handler),
      skipWaiting: async () => {
        activated++;
      },
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        addAll: async (assets: string[]) => {
          cached.push(...assets);
        },
      }),
      keys: async () => ["dayflow-public-old", "unrelated-app"],
      delete: async (key: string) => {
        deleted.push(key);
      },
      match: async () => new Response("Offline fallback"),
    },
    fetch: async () => {
      if (!online) throw new Error("offline");
      return new Response("Live page");
    },
  };
  vm.runInNewContext(serviceWorkerSource("test"), context);
  return {
    handlers,
    cached,
    deleted,
    activated: () => activated,
    offline: () => {
      online = false;
    },
  };
}

test("Manifest points to real PNG icons with matching dimensions and separate maskable asset", () => {
  const icons = manifest().icons!;
  assert.equal(icons.length, 3);
  for (const icon of icons) {
    assert.equal(icon.type, "image/png");
    const png = readFileSync(`public${icon.src}`);
    assert.equal(png.readUInt32BE(16), Number(icon.sizes?.split("x")[0]));
    assert.equal(png.readUInt32BE(20), Number(icon.sizes?.split("x")[1]));
  }
  assert.notEqual(
    icons.find((item) => item.purpose === "maskable")?.src,
    icons[1].src,
  );
});

test("Worker caches public assets only, cleans own caches, and activates only on explicit message", async () => {
  const w = worker();
  let pending: Promise<unknown> = Promise.resolve();
  const waitUntil = (promise: Promise<unknown>) => {
    pending = promise;
  };
  w.handlers.get("install")!({ waitUntil });
  await pending;
  assert.deepEqual(w.cached, [
    "/offline.html",
    "/icons/dayflow-mark.svg",
    "/icons/icon-192.png",
  ]);
  assert.equal(w.activated(), 0);
  w.handlers.get("message")!({ data: { type: "OTHER" }, waitUntil });
  assert.equal(w.activated(), 0);
  w.handlers.get("message")!({ data: { type: "ACTIVATE_UPDATE" }, waitUntil });
  await pending;
  assert.equal(w.activated(), 1);
  w.handlers.get("activate")!({ waitUntil });
  await pending;
  assert.deepEqual(w.deleted, ["dayflow-public-old"]);
});

test("Worker leaves RSC, APIs and mutations alone; navigation is live with offline fallback", async () => {
  const w = worker();
  let response: Promise<Response> | undefined;
  const respondWith = (value: Promise<Response>) => {
    response = value;
  };
  for (const request of [
    { url: "https://dayflow.test/planner?_rsc=x", method: "GET", mode: "cors" },
    { url: "https://dayflow.test/api/tasks", method: "POST", mode: "cors" },
    { url: "https://other.test/", method: "GET", mode: "navigate" },
  ])
    w.handlers.get("fetch")!({ request, respondWith });
  assert.equal(response, undefined);
  const request = {
    url: "https://dayflow.test/planner",
    method: "GET",
    mode: "navigate",
  };
  w.handlers.get("fetch")!({ request, respondWith });
  assert.equal(await (await response!).text(), "Live page");
  w.offline();
  w.handlers.get("fetch")!({ request, respondWith });
  assert.equal(await (await response!).text(), "Offline fallback");
  assert.notEqual(
    serviceWorkerSource("release-1"),
    serviceWorkerSource("release-2"),
  );
});
