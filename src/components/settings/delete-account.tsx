"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteOwnAccount,
  requestAccountDeletionCode,
} from "@/app/settings/delete-account-action";
import { setDeviceRemindersDisabled } from "@/lib/notifications/device";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccount({
  eligible,
  available,
}: {
  eligible: boolean;
  available: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function requestCode() {
    if (pending || sending || cooldown > 0) return;
    setSending(true);
    setMessage("");
    try {
      const result = await requestAccountDeletionCode();
      setMessage(result.message);
      if (result.ok) {
        setCodeSent(true);
        setCode("");
      }
      setCooldown(60);
    } catch {
      setMessage("Could not request a code. Please try again later.");
      setCooldown(60);
    } finally {
      setSending(false);
    }
  }
  const [message, setMessage] = useState("");
  async function remove() {
    if (
      pending ||
      sending ||
      confirmation !== "DELETE" ||
      !codeSent ||
      !/^\d{6}$/.test(code)
    )
      return;
    setPending(true);
    setMessage("");
    try {
      const result = await deleteOwnAccount(confirmation, code);
      if (!result.ok) {
        setMessage(result.message);
        setPending(false);
        return;
      }
    } catch {
      setMessage(
        "Could not confirm deletion. Check whether you can still sign in before retrying, or contact support.",
      );
      setPending(false);
      return;
    }
    // Cleanup is best-effort after successful deletion; it cannot roll back the account.
    try {
      setDeviceRemindersDisabled(true);
      const registration = await navigator.serviceWorker?.getRegistration();
      (await registration?.getNotifications())?.forEach((notification) =>
        notification.close(),
      );
      await (await registration?.pushManager?.getSubscription())?.unsubscribe();
    } catch {
      /* Device cleanup must not turn deletion into a retry prompt. */
    }
    try {
      await createClient().auth.signOut({ scope: "local" });
    } catch {
      /* Server cookies were cleared. */
    }
    window.location.replace("/login?account=deleted");
  }
  return (
    <section className="mt-6 rounded-3xl border border-destructive/40 bg-card p-6">
      <h2 className="font-medium">Delete account</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Permanently delete your account, tasks, routines, one-day changes, share
        links, push subscriptions, and stored feedback. This cannot be undone.
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Downloaded files, screenshots, support email copies, and provider
        backups are not removed by this action. A reminder already in transit
        may still arrive.
      </p>
      <Link
        href="/planner"
        className="mt-3 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
      >
        Go to planner to export your timetable first
      </Link>
      {!available ? (
        <p role="status" className="mt-3 text-sm">
          Account deletion is temporarily unavailable. Contact{" "}
          <a href="mailto:htetkooo2532@gmail.com" className="underline">
            support
          </a>{" "}
          for help.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {eligible
              ? "We will send a six-digit code to your verified account email before you can delete your account."
              : "Sign in with a verified account email before requesting a deletion code."}
          </p>
          <Dialog.Root
            open={open}
            onOpenChange={(value) => {
              if (!pending && !sending) {
                setOpen(value);
                setConfirmation("");
                setCode("");
                setMessage("");
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button
                variant="destructive"
                disabled={!eligible}
                className="mt-5 min-h-11"
              >
                Delete account
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="confirmation-overlay" />
              <Dialog.Content
                className="confirmation-dialog"
                onEscapeKeyDown={(event) => {
                  if (pending || sending) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                  if (pending || sending) event.preventDefault();
                }}
              >
                <Dialog.Title>Permanently delete your account?</Dialog.Title>
                <Dialog.Description>
                  Your planner data and shared links will be removed. This
                  cannot be undone. Request a code, enter it below, then type
                  DELETE to confirm.
                </Dialog.Description>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void remove();
                  }}
                  className="mt-5 space-y-4"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={pending || sending || cooldown > 0}
                    onClick={() => void requestCode()}
                  >
                    {sending
                      ? "Sending code…"
                      : cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : codeSent
                          ? "Send a new code"
                          : "Send verification code"}
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Codes expire after 10 minutes. Five incorrect attempts lock
                    the code. Requesting a new code replaces the previous one.
                  </p>
                  {codeSent && (
                    <label className="grid gap-2 text-sm">
                      Verification code
                      <Input
                        value={code}
                        onChange={(event) =>
                          setCode(
                            event.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 6),
                          )
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        disabled={pending || sending}
                      />
                    </label>
                  )}
                  <label className="grid gap-2 text-sm">
                    Confirmation
                    <Input
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      disabled={pending || sending}
                    />
                  </label>
                  {message && (
                    <p role="status" className="text-sm text-muted-foreground">
                      {message}
                    </p>
                  )}
                  <div className="confirmation-actions">
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending || sending}
                      >
                        Keep account
                      </Button>
                    </Dialog.Close>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={
                        pending ||
                        sending ||
                        !codeSent ||
                        !/^\d{6}$/.test(code) ||
                        confirmation !== "DELETE"
                      }
                    >
                      {pending ? "Deleting…" : "Permanently delete account"}
                    </Button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )}
    </section>
  );
}
