"use client";

import { useEffect, useRef } from "react";
import { authExit } from "@/lib/auth/exit-coordinator";

export function useIntentionalAuthExit() {
  const release = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      release.current?.();
    },
    [],
  );
  return {
    begin() {
      release.current?.();
      release.current = authExit.begin();
    },
    cancel() {
      release.current?.();
      release.current = null;
    },
  };
}
