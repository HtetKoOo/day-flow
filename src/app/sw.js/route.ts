import { serviceWorkerSource } from "@/lib/pwa/worker";

export function GET() {
  return new Response(
    serviceWorkerSource(process.env.DAYFLOW_BUILD_ID ?? "local"),
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Service-Worker-Allowed": "/",
      },
    },
  );
}
