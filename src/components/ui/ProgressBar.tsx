import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
}: {
  value: number; // 0..1
  className?: string;
  tone?: "brand" | "success" | "warning";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color =
    tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-brand-600";
  return (
    <div className={cn("w-full h-2 rounded-full bg-gray-200 overflow-hidden", className)}>
      <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
