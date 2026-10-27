"use client";

import { useIntentionalAuthExit } from "@/components/auth/use-intentional-auth-exit";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { disableDeviceReminders } from "@/lib/notifications/device";

type SignOutAction = () => Promise<void>;

export function SignOutConfirmation({ action }: { action: SignOutAction }) {
  const intentionalExit = useIntentionalAuthExit();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (pending) return;
    intentionalExit.begin();
    setPending(true);
    setError("");
    try {
      // Disconnect while authenticated, before the sign-out action clears cookies.
      await disableDeviceReminders();
    } catch (error) {
      intentionalExit.cancel();
      setError(
        error instanceof Error
          ? error.message
          : "Could not disconnect reminders. Please try again.",
      );
      setPending(false);
      return;
    }
    // Keep redirects outside the cleanup catch so successful logout can navigate.
    try {
      await action();
    } catch (error) {
      unstable_rethrow(error);
      intentionalExit.cancel();
      setError("Could not sign out. Please try again.");
      setPending(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">
          Sign out
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="confirmation-overlay" />
        <Dialog.Content
          className="confirmation-dialog"
          onEscapeKeyDown={(e) => {
            if (pending) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (pending) e.preventDefault();
          }}
        >
          <Dialog.Title>Sign out of DayFlow?</Dialog.Title>
          <Dialog.Description>
            Reminders will stop on this device. You will need to sign in again
            to access your timetable.
          </Dialog.Description>
          {error && <p role="alert">{error}</p>}
          <div className="confirmation-actions">
            <Dialog.Close asChild>
              <button type="button" className="text-button" disabled={pending}>
                Cancel
              </button>
            </Dialog.Close>
            <form action={confirm}>
              <button
                type="submit"
                className="confirmation-danger"
                disabled={pending}
              >
                {pending ? "Signing out…" : "Sign out"}
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
