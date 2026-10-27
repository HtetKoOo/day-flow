"use client";

import { useActionState, useState } from "react";
import { MessageSquare, CheckCircle2, ChevronDown, Check } from "lucide-react";
import { Select } from "radix-ui";
import { submitFeedback } from "@/app/settings/feedback-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FeedbackFields() {
  const [state, action, pending] = useActionState(submitFeedback, {
    ok: false,
    message: "",
  });
  const [kind, setKind] = useState("feedback");
  if (state.ok)
    return (
      <div role="status" className="mt-5 flex items-start gap-3 text-sm">
        <CheckCircle2 className="shrink-0 text-primary" size={20} />
        <p>{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="mt-5 grid gap-5" aria-busy={pending}>
      <div className="grid gap-2 text-sm">
        <label htmlFor="feedback-kind">Type</label>
        <Select.Root
          name="kind"
          value={kind}
          onValueChange={setKind}
          disabled={pending}
        >
          <Select.Trigger
            id="feedback-kind"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-background px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Select.Value />
            <Select.Icon asChild>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border bg-card p-1 text-foreground shadow-lg"
            >
              <Select.Viewport>
                {[
                  ["feedback", "Feedback"],
                  ["bug", "Report a bug"],
                  ["feature", "Feature request"],
                ].map(([value, label]) => (
                  <Select.Item
                    key={value}
                    value={value}
                    className="relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pr-3 pl-9 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:text-primary"
                  >
                    <Select.ItemIndicator className="absolute left-3">
                      <Check size={16} aria-hidden="true" />
                    </Select.ItemIndicator>
                    <Select.ItemText>{label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      <label className="grid gap-2 text-sm">
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          disabled={pending}
          aria-describedby="feedback-help"
          className="min-h-32 w-full resize-y rounded-xl border bg-background p-3 focus-visible:outline-2 focus-visible:outline-primary"
          placeholder={
            kind === "bug"
              ? "What happened? What did you expect, and how can we reproduce it?"
              : "How could DayFlow be better for you?"
          }
        />
      </label>
      <p
        id="feedback-help"
        className="-mt-3 text-xs leading-5 text-muted-foreground"
      >
        10–4,000 characters. Please leave out passwords and private task
        details. Your app version is included automatically.
      </p>
      <label className="grid gap-2 text-sm">
        Reply email (optional)
        <Input
          name="replyEmail"
          type="email"
          maxLength={254}
          autoComplete="email"
          disabled={pending}
          placeholder="Only if you’d like a reply"
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        Your message and account ID are saved for support. Your message and
        optional reply email may be sent to the DayFlow developer through our
        email provider. Task titles and notes are not attached.
      </p>
      <div>
        <Button disabled={pending} className="min-h-11">
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function FeedbackForm() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="dayflow-feedback"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center gap-3 text-left font-medium"
      >
        <MessageSquare size={20} className="text-primary" />
        <span className="min-w-0 flex-1">Send feedback or report an issue</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`ml-auto shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id="dayflow-feedback" hidden={!open}>
        <FeedbackFields />
      </div>
    </section>
  );
}
