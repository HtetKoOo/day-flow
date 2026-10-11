import { createClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { CalendarDays, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { taskColor } from "@/lib/tasks/colors";
import { taskIcon } from "@/lib/tasks/icons";
import { supabaseEnv } from "@/lib/env";
import { DayFlowLogo } from "@/components/brand/dayflow-logo";

type SharedItem = {
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  title: string;
  color: string;
  icon: string;
};

export const dynamic = "force-dynamic";

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function rangeLabel(startsOn: string, endsOn: string) {
  const first = parseISO(startsOn);
  const last = parseISO(endsOn);
  return startsOn === endsOn
    ? format(first, "MMMM d, yyyy")
    : `${format(first, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
}

export default async function SharedTimetable({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [{ data, error }, { data: metadata, error: metadataError }] =
    await Promise.all([
      supabase.rpc("get_shared_timetable", { p_token: token }),
      supabase.rpc("get_shared_timetable_info", { p_token: token }),
    ]);
  const share = metadata?.[0];
  if (error || metadataError || !data || !share) notFound();
  const items = data as SharedItem[];
  const days = Map.groupBy(items, (item) => item.scheduled_date);
  return (
    <main className="shared-timetable">
      <header className="shared-header">
        <DayFlowLogo className="shared-brand" markSize={22} />
        <h1>
          {share.display_name
            ? `${share.display_name}’s timetable`
            : "Shared timetable"}
        </h1>
        <p className="shared-range">
          {rangeLabel(share.starts_on, share.ends_on)}
        </p>
        <span className="shared-privacy">
          <Eye size={15} aria-hidden="true" />
          View-only · Private items are hidden
        </span>
      </header>
      {items.length === 0 ? (
        <div className="shared-empty">
          <CalendarDays size={24} aria-hidden="true" />
          <p>No shared tasks in this time range.</p>
        </div>
      ) : (
        <div className="shared-days">
          {[...days].map(([date, dayItems]) => (
            <section key={date} className="shared-day">
              <div className="shared-day-heading">
                <span>{format(parseISO(date), "EEE")}</span>
                <strong>{format(parseISO(date), "d")}</strong>
                <h2>{format(parseISO(date), "MMMM")}</h2>
              </div>
              <div className="shared-items">
                {dayItems.map((item, index) => {
                  const Icon = taskIcon(item.icon as never);
                  return (
                    <article
                      key={`${date}-${item.start_time}-${index}`}
                      className="shared-item"
                      data-color={taskColor(item.color)}
                    >
                      <time>{item.start_time.slice(0, 5)}</time>
                      <span className="shared-icon">
                        {Icon && <Icon size={19} aria-hidden="true" />}
                      </span>
                      <div className="shared-item-body">
                        <strong>{item.title}</strong>
                        <span>{durationLabel(item.duration_minutes)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
