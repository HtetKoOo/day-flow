"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";

type SignOutAction = () => Promise<void>;

export function SignOutConfirmation({ action }: { action: SignOutAction }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline">Sign out</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="confirmation-overlay" />
        <Dialog.Content className="confirmation-dialog">
          <Dialog.Title>Sign out of DayFlow?</Dialog.Title>
          <Dialog.Description>
            You will need to sign in again to access your timetable.
          </Dialog.Description>
          <div className="confirmation-actions">
            <Dialog.Close asChild>
              <button type="button" className="text-button">Cancel</button>
            </Dialog.Close>
            <form action={action}>
              <button type="submit" className="confirmation-danger">Sign out</button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
