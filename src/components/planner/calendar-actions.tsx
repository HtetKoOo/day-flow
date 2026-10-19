"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog, DropdownMenu } from "radix-ui";
import {
  Check,
  Download,
  Link2,
  Upload,
  X,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import {
  createTimetableShare,
  importCalendarTasks,
} from "@/app/planner/actions";
import {
  readIcsCalendar,
  type ImportedCalendarEvent,
} from "@/lib/calendar/ics";

type PrivateMode = "exclude" | "busy" | "details";

export function CalendarActions({
  from,
  to,
  label,
  onImported,
  timezone,
}: {
  from: string;
  to: string;
  label: string;
  onImported: () => void;
  timezone: string;
}) {
  const [open, setOpen] = useState<"export" | "import" | "share" | null>(null);
  const [privateMode, setPrivateMode] = useState<PrivateMode>("exclude");
  const [includeNotes, setIncludeNotes] = useState(false);
  const [events, setEvents] = useState<ImportedCalendarEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importPrivate, setImportPrivate] = useState(true);
  const [importNotice, setImportNotice] = useState("");
  const [importResult, setImportResult] = useState("");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const exportHref = `/api/calendar/export?from=${from}&to=${to}&private=${privateMode}&notes=${includeNotes ? "1" : "0"}`;

  async function readFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setImportResult("");
    setImportNotice("");
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Choose a calendar file smaller than 2 MB.");
      const result = readIcsCalendar(await file.text(), timezone);
      const parsed = result.events.filter(
        (event) => event.date >= from && event.date <= to,
      );
      if (parsed.length > 200)
        throw new Error(
          "Import up to 200 events at a time. Choose a smaller calendar range.",
        );
      const outside = result.events.length - parsed.length;
      setImportNotice(
        [
          result.skipped
            ? `${result.skipped} unsupported or invalid events skipped (including recurring, all-day, or overnight events).`
            : "",
          result.duplicates
            ? `${result.duplicates} duplicate events in this file skipped.`
            : "",
          outside ? `${outside} events outside this range skipped.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      setEvents(parsed);
      setSelected(new Set(parsed.map((event) => event.id)));
      if (!parsed.length)
        setError(`No calendar events fall within this ${label.toLowerCase()}.`);
    } catch (error) {
      setEvents([]);
      setSelected(new Set());
      setError(
        error instanceof Error
          ? error.message
          : "That calendar file could not be read.",
      );
    }
  }

  function toggleEvent(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function importSelected() {
    const chosen = events
      .filter((event) => selected.has(event.id))
      .map((event) => ({
        title: event.title,
        notes: event.notes,
        source_uid: event.sourceUid,
        recurrence_id: event.recurrenceId,
        is_private: importPrivate,
        scheduled_date: event.date,
        start_time: event.startTime,
        duration_minutes: event.durationMinutes,
      }));
    setError("");
    startTransition(async () => {
      const result = await importCalendarTasks(chosen);
      if (!result.ok) return setError(result.message);
      onImported();
      setImportResult(result.message);
      setEvents([]);
      setSelected(new Set());
    });
  }

  function createShareLink() {
    setError("");
    startTransition(async () => {
      const result = await createTimetableShare({ from, to });
      if (!result.ok || !result.token) return setError(result.message);
      setShareUrl(`${window.location.origin}/share/${result.token}`);
    });
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy the link from the field below.");
    }
  }

  return (
    <>
      <div className="calendar-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => setOpen("export")}
          aria-label="Export calendar"
          title="Export calendar"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setOpen("import")}
          aria-label="Import calendar"
          title="Import calendar"
        >
          <Upload size={18} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => {
            setError("");
            setShareUrl("");
            setCopied(false);
            setOpen("share");
          }}
          aria-label="Share timetable"
          title="Share timetable"
        >
          <Link2 size={18} />
        </button>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="icon-button planner-more-trigger"
            aria-label="More planner options"
          >
            <MoreHorizontal size={20} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="planner-options-menu"
            align="end"
            sideOffset={8}
            collisionPadding={8}
          >
            <DropdownMenu.Item onSelect={() => setOpen("export")}>
              <Download size={17} /> Export calendar
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => setOpen("import")}>
              <Upload size={17} /> Import calendar
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => {
                setError("");
                setShareUrl("");
                setCopied(false);
                setOpen("share");
              }}
            >
              <Link2 size={17} /> Share timetable
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item asChild>
              <Link href="/settings">
                <Settings size={17} /> Settings
              </Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Dialog.Root
        open={open === "export"}
        onOpenChange={(value) => !value && setOpen(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay" />
          <Dialog.Content className="calendar-dialog">
            <div className="sheet-heading">
              <div>
                <Dialog.Title>Export calendar</Dialog.Title>
                <Dialog.Description>
                  {label}: {from} to {to}
                </Dialog.Description>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(null)}
                aria-label="Close export calendar"
              >
                <X size={20} />
              </button>
            </div>
            <fieldset className="calendar-options">
              <legend>Private items</legend>
              {(
                [
                  ["exclude", "Exclude private items"],
                  ["busy", "Show private items as Busy"],
                  ["details", "Include private details"],
                ] as const
              ).map(([value, text]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="privacy"
                    checked={privateMode === value}
                    onChange={() => setPrivateMode(value)}
                  />
                  {text}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(event) => setIncludeNotes(event.target.checked)}
                />{" "}
                Include task notes
              </label>
            </fieldset>
            <a
              className="primary-button calendar-download"
              href={exportHref}
              onClick={() => setOpen(null)}
            >
              <Download size={17} /> Download .ics file
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={open === "share"}
        onOpenChange={(value) => !value && !pending && setOpen(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay" />
          <Dialog.Content className="calendar-dialog">
            <div className="sheet-heading">
              <div>
                <Dialog.Title>Share timetable</Dialog.Title>
                <Dialog.Description>
                  {label}: {from} to {to}
                </Dialog.Description>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(null)}
                aria-label="Close sharing"
              >
                <X size={20} />
              </button>
            </div>
            <p className="calendar-share-note">
              Anyone with this link can view this timetable. Private tasks and
              routines are always excluded.
            </p>
            {shareUrl ? (
              <>
                <input
                  className="calendar-share-link"
                  value={shareUrl}
                  readOnly
                  aria-label="Timetable share link"
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void copyShareLink()}
                >
                  {copied ? <Check size={17} /> : <Link2 size={17} />}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={pending}
                onClick={createShareLink}
              >
                <Link2 size={17} />{" "}
                {pending ? "Creating…" : "Create view-only link"}
              </button>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={open === "import"}
        onOpenChange={(value) => !value && !pending && setOpen(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay" />
          <Dialog.Content className="calendar-dialog">
            <div className="sheet-heading">
              <div>
                <Dialog.Title>Import calendar</Dialog.Title>
                <Dialog.Description>
                  {from} to {to}. Times are shown in {timezone}.
                </Dialog.Description>
              </div>
              <button
                type="button"
                className="icon-button"
                disabled={pending}
                onClick={() => setOpen(null)}
                aria-label="Close import calendar"
              >
                <X size={20} />
              </button>
            </div>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".ics,text/calendar"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="calendar-file-button"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={18} /> Choose .ics file
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              Existing imports are skipped. Recurring, all-day, and overnight
              events are not imported.
            </p>
            {importNotice && (
              <p className="mt-3 text-sm text-muted-foreground" role="status">
                {importNotice}
              </p>
            )}
            {importResult && (
              <p className="mt-3 text-sm text-primary" role="status">
                {importResult}
              </p>
            )}
            {events.length > 0 && (
              <label className="privacy-toggle mt-4">
                <input
                  type="checkbox"
                  checked={importPrivate}
                  disabled={pending}
                  onChange={(e) => setImportPrivate(e.target.checked)}
                />
                <span>
                  <strong>Keep imported tasks private</strong>
                  <small>
                    Hidden from shared timetables. Uncheck only if you want to
                    share these tasks.
                  </small>
                </span>
              </label>
            )}
            {events.length > 0 && (
              <div
                className="calendar-import-list"
                role="group"
                aria-label="Calendar events to import"
              >
                {events.map((event) => (
                  <label key={event.id}>
                    <input
                      type="checkbox"
                      checked={selected.has(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      disabled={pending}
                    />
                    <span>
                      <strong>{event.title}</strong>
                      <small>
                        {event.date} · {event.startTime} ·{" "}
                        {event.durationMinutes}m
                        {event.allDay ? " · All-day" : ""}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {events.length > 0 && (
              <button
                type="button"
                className="primary-button"
                disabled={pending || selected.size === 0}
                onClick={importSelected}
              >
                <Check size={17} />{" "}
                {pending ? "Importing…" : `Import ${selected.size} selected`}
              </button>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
