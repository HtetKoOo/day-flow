"use client";
import { useEffect } from "react";
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* App remains usable without offline fallback. */
        });
    }
  }, []);
  return null;
}
