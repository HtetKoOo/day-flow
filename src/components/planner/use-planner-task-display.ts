"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";

type Router = { refresh: () => void };
type ScheduleMessage = {
  id?: string;
  type?: string;
  task?: InboxTask;
  day?: string | null;
  time?: string | null;
};

export function usePlannerTaskDisplay({
  tasks,
  scheduled,
  total,
  router,
}: {
  tasks: InboxTask[];
  scheduled: ScheduledTask[];
  total: number;
  router: Router;
}) {
  const [display, setDisplay] = useState(() => ({
    tasks,
    scheduled,
    total,
    sourceTasks: tasks,
    sourceScheduled: scheduled,
    sourceTotal: total,
  }));
  const receivedMessages = useRef(new Set<string>());

  if (
    display.sourceTasks !== tasks ||
    display.sourceScheduled !== scheduled ||
    display.sourceTotal !== total
  ) {
    setDisplay({
      tasks,
      scheduled,
      total,
      sourceTasks: tasks,
      sourceScheduled: scheduled,
      sourceTotal: total,
    });
  }

  const applySchedule = useCallback(
    (task: InboxTask, day: string | null, time: string | null) => {
      const movesToInbox = !day || !time;
      setDisplay((current) => {
        const existingInbox = current.tasks.find((item) => item.id === task.id);
        const existingScheduled = current.scheduled.find(
          (item) => item.id === task.id,
        );
        const wasInInbox = Boolean(existingInbox);
        const nextTask = {
          ...(existingInbox ?? existingScheduled ?? task),
          ...task,
          scheduled_date: day,
          start_time: time,
        };
        return {
          ...current,
          tasks: movesToInbox
            ? [...current.tasks.filter((item) => item.id !== task.id), nextTask]
            : current.tasks.filter((item) => item.id !== task.id),
          scheduled: movesToInbox
            ? current.scheduled.filter((item) => item.id !== task.id)
            : [
                ...current.scheduled.filter((item) => item.id !== task.id),
                nextTask as ScheduledTask,
              ],
          total:
            wasInInbox === movesToInbox
              ? current.total
              : Math.max(0, current.total + (movesToInbox ? 1 : -1)),
        };
      });
    },
    [],
  );

  const publishSchedule = useCallback(
    (task: InboxTask, day: string | null, time: string | null) => {
      const id =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const message = { type: "schedule", id, task, day, time };
      try {
        const channel = new BroadcastChannel("dayflow-planner");
        channel.postMessage(message);
        channel.close();
      } catch {}
      try {
        localStorage.setItem("dayflow-planner-sync", JSON.stringify(message));
        localStorage.removeItem("dayflow-planner-sync");
      } catch {}
    },
    [],
  );

  useEffect(() => {
    const receive = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const payload = message as ScheduleMessage;
      if (
        payload.type !== "schedule" ||
        !payload.task ||
        typeof payload.task.id !== "string"
      )
        return;
      if (payload.id && receivedMessages.current.has(payload.id)) return;
      if (payload.id) {
        receivedMessages.current.add(payload.id);
        if (receivedMessages.current.size > 100) {
          const oldest = receivedMessages.current.values().next().value;
          if (oldest) receivedMessages.current.delete(oldest);
        }
      }
      applySchedule(payload.task, payload.day ?? null, payload.time ?? null);
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("dayflow-planner");
      channel.onmessage = (event) => receive(event.data);
    } catch {}
    const receiveStorage = (event: StorageEvent) => {
      if (event.key !== "dayflow-planner-sync" || !event.newValue) return;
      try {
        receive(JSON.parse(event.newValue));
      } catch {}
    };
    window.addEventListener("storage", receiveStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", receiveStorage);
    };
  }, [applySchedule]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("dayflow-planner-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const row = payload.new as Partial<InboxTask>;
          if (
            typeof row.id !== "string" ||
            typeof row.title !== "string" ||
            typeof row.notes !== "string" ||
            typeof row.duration_minutes !== "number" ||
            typeof row.is_completed !== "boolean"
          ) {
            router.refresh();
            return;
          }
          applySchedule(
            row as InboxTask,
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
            typeof row.start_time === "string"
              ? row.start_time.slice(0, 5)
              : null,
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applySchedule, router]);

  return {
    displayTasks: display.tasks,
    displayScheduled: display.scheduled,
    displayTotal: display.total,
    applySchedule,
    publishSchedule,
  };
}
