import { cn } from "@/lib/utils";

export function DayFlowMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={cn("dayflow-mark", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="10" fill="currentColor" />
      <path d="M8 6h6c13.3 0 13.3 20 0 20H8V6Z" fill="#f8f7f5" />
      <path d="M11 9v14h3c8.6 0 8.6-14 0-14h-3Z" fill="currentColor" />
      <circle cx="17.2" cy="17.2" r="2.1" fill="#a3ec76" />
      <rect x="13.4" y="20.25" width="8.1" height="1.5" rx=".75" fill="#f8f7f5" />
    </svg>
  );
}

export function DayFlowLogo({
  className,
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn("dayflow-logo", className)}>
      <DayFlowMark size={markSize} />
      <span>DayFlow</span>
    </span>
  );
}
