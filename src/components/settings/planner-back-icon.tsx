"use client";

import { useLinkStatus } from "next/link";
import { ArrowLeft, LoaderCircle } from "lucide-react";

export function PlannerBackIcon() {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderCircle
          size={19}
          className="planner-spinner"
          aria-hidden="true"
        />
      ) : (
        <ArrowLeft size={19} aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {pending ? "Opening planner…" : ""}
      </span>
    </>
  );
}
