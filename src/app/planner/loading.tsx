function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} aria-hidden="true" />;
}

export default function PlannerLoading() {
  return (
    <main className="planner-app" aria-busy="true" aria-label="Loading planner">
      <header className="app-header">
        <Skeleton className="h-11 w-28" />
        <div className="calendar-navigation">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-11 w-72" />
      </header>
      <div className="planner-workspace">
        <aside className="inbox-sidebar">
          <div className="inbox-content space-y-4 p-5">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </aside>
        <section className="planner-main">
          <div className="planner-stage">
            <div className="date-strip" aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-14" />
              ))}
            </div>
            <div className="timeline-scroll">
              <div className="space-y-12 px-10 py-16">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center gap-5">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-14 w-14" />
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-6 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
