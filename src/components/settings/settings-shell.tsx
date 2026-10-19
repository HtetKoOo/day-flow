"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, CircleUserRound, KeyRound, Palette, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

const navigation = [
  { id: "profile", label: "Profile", description: "Name and account", Icon: CircleUserRound },
  { id: "planning", label: "Planning", description: "Timezone and reminders", Icon: BellRing },
  { id: "sharing", label: "Sharing", description: "View-only links", Icon: Share2 },
  { id: "appearance", label: "Appearance", description: "Theme", Icon: Palette },
  { id: "security", label: "Security", description: "Password", Icon: KeyRound },
] as const;

type SectionId = (typeof navigation)[number]["id"];
type Sections = Record<SectionId, ReactNode>;

export function SettingsShell({ sections, defaultSection }: { sections: Sections; defaultSection?: string }) {
  const initialSection = navigation.some((item) => item.id === defaultSection)
    ? defaultSection as SectionId
    : "profile";
  const [active, setActive] = useState<SectionId>(initialSection);

  useEffect(() => {
    function handlePopState() {
      const section = new URLSearchParams(window.location.search).get("section");
      setActive(navigation.some((item) => item.id === section) ? section as SectionId : "profile");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const activeItem = navigation.find((item) => item.id === active)!;

  function select(section: SectionId) {
    setActive(section);
    window.history.replaceState(null, "", section === "profile" ? "/settings" : `/settings?section=${section}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex items-center justify-between gap-4 border-b pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/planner" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Back to planner" title="Back to planner">
            <ArrowLeft size={19} />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">DayFlow</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <nav className="lg:sticky lg:top-8 lg:self-start" aria-label="Settings sections">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {navigation.map(({ id, label, description, Icon }) => {
              const selected = id === active;
              return <button key={id} type="button" onClick={() => select(id)} aria-current={selected ? "page" : undefined} className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full ${selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <Icon size={18} />
                <span><span className="block text-sm font-medium">{label}</span><span className={`hidden text-xs lg:block ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{description}</span></span>
              </button>;
            })}
          </div>
        </nav>

        <section className="min-w-0">
          <div className="mb-5 lg:mb-6"><h2 className="text-xl font-semibold">{activeItem.label}</h2><p className="mt-1 text-sm text-muted-foreground">{activeItem.description}</p></div>
          {navigation.map(({ id }) => <div key={id} hidden={id !== active} className="[&>section:first-child]:mt-0">{sections[id]}</div>)}
        </section>
      </div>
    </main>
  );
}
