"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  BellRing,
  CircleUserRound,
  KeyRound,
  Palette,
  Share2,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import "./settings.css";
import { PlannerBackIcon } from "./planner-back-icon";

const navigation = [
  {
    id: "profile",
    label: "Profile",
    description: "Name and account",
    Icon: CircleUserRound,
  },
  {
    id: "planning",
    label: "Planning",
    description: "Timezone and reminders",
    Icon: BellRing,
  },
  {
    id: "sharing",
    label: "Sharing",
    description: "View-only links",
    Icon: Share2,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme",
    Icon: Palette,
  },
  {
    id: "app",
    label: "App",
    description: "Install and updates",
    Icon: Download,
  },
  {
    id: "security",
    label: "Security",
    description: "Password",
    Icon: KeyRound,
  },
] as const;

type SectionId = (typeof navigation)[number]["id"];
type Sections = Record<SectionId, ReactNode>;

export function SettingsShell({
  sections,
  defaultSection,
}: {
  sections: Sections;
  defaultSection?: string;
}) {
  const initialSection = navigation.some((item) => item.id === defaultSection)
    ? (defaultSection as SectionId)
    : "profile";
  const [active, setActive] = useState<SectionId>(initialSection);
  const [mobileDetail, setMobileDetail] = useState(
    navigation.some((item) => item.id === defaultSection),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>(
    {},
  );

  useEffect(() => {
    function handlePopState() {
      const section = new URLSearchParams(window.location.search).get(
        "section",
      );
      const valid = navigation.some((item) => item.id === section);
      setActive(valid ? (section as SectionId) : "profile");
      setMobileDetail(valid);
      if (!window.matchMedia("(min-width: 640px)").matches) {
        requestAnimationFrame(() => {
          if (valid) headingRef.current?.focus();
          else listRefs.current[active]?.focus();
        });
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [active]);
  const activeItem = navigation.find((item) => item.id === active)!;

  function select(section: SectionId) {
    setActive(section);
    setMobileDetail(true);
    const url = `/settings?section=${section}`;
    if (window.matchMedia("(min-width: 640px)").matches) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(
        { ...window.history.state, dayflowSettingsDetail: true },
        "",
        url,
      );
      requestAnimationFrame(() => {
        headingRef.current?.focus();
        window.scrollTo(0, 0);
      });
    }
  }
  function backToList() {
    if (window.history.state?.dayflowSettingsDetail) {
      window.history.back();
    } else {
      setMobileDetail(false);
      window.history.replaceState(null, "", "/settings");
      requestAnimationFrame(() => listRefs.current[active]?.focus());
    }
  }

  return (
    <main className="settings-page mx-auto min-h-dvh max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex items-center justify-between gap-4 border-b pb-4 sm:pb-5">
        <div className="grid w-full min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 sm:flex sm:w-auto">
          {mobileDetail && (
            <button
              type="button"
              onClick={backToList}
              className="inline-flex size-11 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
              aria-label="Back to Settings"
            >
              <ArrowLeft size={19} />
            </button>
          )}
          <Link
            href="/planner"
            prefetch={true}
            className={`${mobileDetail ? "hidden sm:inline-flex" : "inline-flex"} size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground`}
            aria-label="Back to planner"
            title="Back to planner"
          >
            <PlannerBackIcon />
          </Link>
          <div className="min-w-0 text-center sm:text-left">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
            >
              <span className="sm:hidden">
                {mobileDetail ? activeItem.label : "Settings"}
              </span>
              <span className="hidden sm:inline">Settings</span>
            </h1>
          </div>
          <span aria-hidden="true" className="size-11 sm:hidden" />
        </div>
      </header>

      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <nav
          className={`${mobileDetail ? "hidden sm:block" : "block"} lg:sticky lg:top-8 lg:self-start`}
          aria-label="Settings sections"
        >
          <div className="divide-y overflow-hidden rounded-2xl border bg-card sm:hidden">
            {navigation.map(({ id, label, description, Icon }) => (
              <button
                key={id}
                ref={(element) => {
                  listRefs.current[id] = element;
                }}
                type="button"
                onClick={() => select(id)}
                className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {description}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-muted-foreground"
                />
              </button>
            ))}
          </div>
          <div className="-mx-1 hidden gap-2 sm:flex overflow-x-auto px-1 pb-2 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {navigation.map(({ id, label, description, Icon }) => {
              const selected = id === active;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full ${selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Icon size={18} />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span
                      className={`hidden text-xs lg:block ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}
                    >
                      {description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <section
          className={`settings-detail min-w-0 ${mobileDetail ? "block" : "hidden sm:block"}`}
        >
          <div className="mb-4 hidden sm:mb-5 sm:block lg:mb-6">
            <h2 className="text-xl font-semibold">{activeItem.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeItem.description}
            </p>
          </div>
          {navigation.map(({ id }) => (
            <div
              key={id}
              hidden={id !== active}
              className="[&>section:first-child]:mt-0"
            >
              {sections[id]}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
