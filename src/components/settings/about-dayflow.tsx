import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { DayFlowMark } from "@/components/brand/dayflow-logo";
import packageInfo from "../../../package.json";

const highlights = [
  {
    title: "Clearer sign-in help",
    detail:
      "Helpful messages for incorrect passwords, email confirmation, and Google sign-in.",
  },
  {
    title: "Choose your Google account",
    detail: "Google sign-in now requests an account chooser.",
  },
  {
    title: "Easier profile settings",
    detail:
      "See your saved name and timezone, then choose Change to edit them.",
  },
  {
    title: "Better settings layouts",
    detail:
      "Names, timezones, and editing buttons fit more comfortably on smaller screens.",
  },
];

export function AboutDayFlow() {
  return (
    <section
      className="rounded-3xl border bg-card p-6"
      aria-labelledby="about-dayflow-title"
    >
      <h3 id="about-dayflow-title" className="font-medium">
        About DayFlow
      </h3>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <DayFlowMark size={44} className="shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tracking-tight">DayFlow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan tomorrow tonight.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          Version {packageInfo.version}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        A personal planner for making a realistic plan and finding a calmer
        rhythm for your day.
      </p>
      <details className="group mt-5 border-t pt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-medium [&::-webkit-details-marker]:hidden">
          What’s new in this release
          <ChevronDown
            size={17}
            aria-hidden="true"
            className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <ul className="mt-3 space-y-4 pb-2">
          {highlights.map(({ title, detail }) => (
            <li key={title}>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {detail}
              </p>
            </li>
          ))}
        </ul>
      </details>
      <div className="flex flex-wrap items-center gap-x-6">
        <Link
          href="/demo"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Explore the demo <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link
          href="/privacy"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
        >
          Privacy policy
        </Link>
      </div>
    </section>
  );
}
