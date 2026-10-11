"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { revokeTimetableShare } from "@/app/settings/actions";

type Share = {
  token: string;
  starts_on: string;
  ends_on: string;
  created_at: string;
};

export function ShareLinkManager({ shares }: { shares: Share[] }) {
  const [items, setItems] = useState(shares);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function copy(token: string) {
    const link = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Share link copied.");
    } catch {
      setMessage("Copy the link from the Planner share dialog.");
    }
  }

  function remove(token: string) {
    setMessage("");
    startTransition(async () => {
      const result = await revokeTimetableShare(token);
      setMessage(result.message);
      if (result.ok) setItems((current) => current.filter((item) => item.token !== token));
    });
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 text-primary" size={19} />
        <div>
          <h2 className="font-medium">Shared timetables</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These links are view-only. Private tasks and routines stay hidden.
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No active share links. Create one from the Planner.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {items.map((share) => (
            <li key={share.token} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <strong className="block text-sm">{share.starts_on} to {share.ends_on}</strong>
                <span className="text-xs text-muted-foreground">View-only link</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="icon-button" onClick={() => void copy(share.token)} aria-label="Copy share link" title="Copy share link">
                  <Copy size={17} />
                </button>
                <button type="button" className="icon-button text-destructive" disabled={pending} onClick={() => remove(share.token)} aria-label="Stop sharing" title="Stop sharing">
                  <Trash2 size={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
