export function serviceWorkerSource(version: string) {
  return (
    "const BUILD_VERSION = " +
    JSON.stringify(version) +
    ";\n" +
    String.raw`
/* Only public offline assets are cached. Never cache auth, HTML, RSC, or user data. */
const CACHE = "dayflow-public-" + BUILD_VERSION;
const ASSETS = [
  "/offline.html",
  "/icons/dayflow-mark.svg",
  "/icons/icon-192.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("dayflow-public-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(async () => (await caches.match("/offline.html")) || new Response("You are offline. Reconnect to open DayFlow.", { status: 503, headers: { "Content-Type": "text/plain" } })),
    );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "DayFlow reminder", {
    body: payload.body || "You have an upcoming task.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "dayflow-reminder",
    data: { url: payload.url || "/planner" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/planner"));
});
`
  );
}
