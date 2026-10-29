"use client";

import { useActionState, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { updateTimezone } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TimezoneForm({ defaultValue }: { defaultValue: string }) {
  const [timezone, setTimezone] = useState(defaultValue);
  const deviceTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);
  const [saved, setSaved] = useState(defaultValue);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (
      previous: import("@/app/settings/actions").ProfileState,
      form: FormData,
    ) => {
      const result = await updateTimezone(previous, form);
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
      <div className="flex items-start gap-3">
        <Clock3 className="mt-0.5 text-primary" size={19} />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Timezone</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Task times and reminders use this timezone.
          </p>
        </div>
      </div>
      {!editing && (
        <div className="profile-saved-value mt-5">
          <p className="min-w-0 font-medium [overflow-wrap:anywhere]">
            {saved || "Not set"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTimezone(saved);
              setEditing(true);
            }}
          >
            Change
          </Button>
        </div>
      )}
      {editing && (
        <form action={action} className="profile-edit-form mt-5 grid gap-4">
          <label className="min-w-0 space-y-2">
            <span className="text-sm">Your timezone</span>
            <Input
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              maxLength={100}
              placeholder="Asia/Bangkok"
              list="dayflow-timezones"
              required
            />
          </label>
          <div className="profile-edit-actions">
            <Button disabled={pending}>
              {pending ? "Saving…" : "Save timezone"}
            </Button>
            {deviceTimezone && deviceTimezone !== timezone && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setTimezone(deviceTimezone)}
              >
                Use device timezone
              </Button>
            )}
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
      <datalist id="dayflow-timezones">
        <option value="Asia/Bangkok" />
        <option value="Asia/Yangon" />
        <option value="Asia/Singapore" />
        <option value="Asia/Tokyo" />
        <option value="Europe/London" />
        <option value="America/New_York" />
        <option value="UTC" />
      </datalist>
      {state.message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
    </section>
  );
}
