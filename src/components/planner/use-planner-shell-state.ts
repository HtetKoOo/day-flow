"use client";

import { useState, useSyncExternalStore } from "react";

export type SidebarMode = "inbox" | "routines";

function readInbox() {
  try {
    return localStorage.getItem("dayflow-inbox") !== "closed";
  } catch {
    return true;
  }
}

function subscribeInbox(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dayflow-inbox-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dayflow-inbox-change", callback);
  };
}

function readMobile() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function readClock() {
  return Math.floor(Date.now() / 60000);
}

function subscribeClock(callback: () => void) {
  const timer = window.setInterval(callback, 60000);
  return () => window.clearInterval(timer);
}

/** Owns the remembered sidebar choice and responsive planner panel state. */
export function usePlannerShellState(timezone: string) {
  const [mobile, setMobile] = useState("planner");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("inbox");
  const isMobile = useSyncExternalStore(subscribeMobile, readMobile, () => false);
  const inboxOpen = useSyncExternalStore(subscribeInbox, readInbox, () => true);
  const minute = useSyncExternalStore(subscribeClock, readClock, () => 0);
  const evening = minute > 0 && Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(minute * 60000)),
  ) >= 18;

  function setInboxVisibility(open: boolean) {
    try {
      localStorage.setItem("dayflow-inbox", open ? "open" : "closed");
    } catch {}
    window.dispatchEvent(new Event("dayflow-inbox-change"));
  }

  function selectSidebar(mode: SidebarMode) {
    if (isMobile) {
      if (mobile === "inbox" && sidebarMode === mode) {
        setMobile("planner");
        setInboxVisibility(false);
        return;
      }
      setSidebarMode(mode);
      setMobile("inbox");
      setInboxVisibility(true);
      return;
    }
    if (inboxOpen && sidebarMode === mode) {
      setInboxVisibility(false);
      return;
    }
    setSidebarMode(mode);
    setInboxVisibility(true);
  }

  return { mobile, setMobile, sidebarMode, isMobile, inboxOpen, evening, selectSidebar };
}
