"use client";

import { useActionState, useState } from "react";
import { updateDisplayName } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const [saved, setSaved] = useState(defaultValue);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (
      previous: import("@/app/settings/actions").ProfileState,
      form: FormData,
    ) => {
      const result = await updateDisplayName(previous, form);
      if (result.ok && result.value !== undefined) {
        setSaved(result.value);
        setEditing(false);
      }
      return result;
    },
    {
      message: "",
    },
  );
  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <h2 className="font-medium">Display name</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This name appears on view-only timetable links. Your email is never
        shared.
      </p>
      {!editing && (
        <div className="profile-saved-value mt-5">
          <p className="min-w-0 font-medium [overflow-wrap:anywhere]">
            {saved || "Not set"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Change
          </Button>
        </div>
      )}
      {editing && (
        <form action={action} className="profile-edit-form mt-5 grid gap-4">
          <label className="min-w-0 space-y-2">
            <span className="text-sm">Name</span>
            <Input
              name="displayName"
              defaultValue={saved}
              maxLength={100}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
          <div className="profile-edit-actions">
            <Button disabled={pending}>
              {pending ? "Saving…" : "Save name"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {state.message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
    </section>
  );
}
