export default function SettingsLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="h-16 animate-pulse rounded-xl border bg-card" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-2 lg:block">
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl border bg-card" />
        </div>
      </div>
    </main>
  );
}
