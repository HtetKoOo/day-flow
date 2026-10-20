export default function SettingsLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="h-16 animate-pulse rounded-xl border bg-card" />
      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="divide-y overflow-hidden rounded-2xl border bg-card sm:hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex h-20 items-center gap-3 px-4">
              <div className="size-10 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden space-y-2 lg:block">
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="hidden space-y-4 sm:block">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl border bg-card" />
        </div>
      </div>
    </main>
  );
}
