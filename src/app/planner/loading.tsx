export default function PlannerLoading() {
  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Loading planner"
    >
      <p className="sr-only" role="status">
        Opening planner…
      </p>
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-t-3xl bg-card p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
        <div className="mx-auto mt-10 w-full max-w-lg space-y-8 px-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="h-12 w-2/3 animate-pulse rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
