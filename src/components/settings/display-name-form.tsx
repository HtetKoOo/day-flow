"use client";

import { useActionState } from "react";
import { updateDisplayName } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, {
    message: "",
  });
  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <h2 className="font-medium">Display name</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This name appears on view-only timetable links. Your email is never shared.
      </p>
      <form action={action} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1 space-y-2">
          <span className="text-sm">Name</span>
          <Input
            name="displayName"
            defaultValue={defaultValue}
            maxLength={100}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
        <Button disabled={pending}>{pending ? "Saving…" : "Save name"}</Button>
      </form>
      {state.message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
    </section>
  );
}
