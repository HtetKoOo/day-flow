import type { Metadata } from "next";
import { DemoPlanner } from "@/components/demo/demo-planner";

export const metadata: Metadata = {
  title: "DayFlow demo — Plan tomorrow tonight",
  description: "Explore a resettable sample DayFlow plan without an account.",
};

export default function DemoPage() {
  return <DemoPlanner />;
}
