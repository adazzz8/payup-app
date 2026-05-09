import { cn } from "@/lib/utils/cn";

type StatCardTone = "neutral" | "success" | "warning";

type StatCardProps = {
  label: string;
  value: string;
  tone?: StatCardTone;
  compact?: boolean;
};

const toneClassMap: Record<StatCardTone, string> = {
  neutral: "border-border bg-surface",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
};

export function StatCard({ label, value, tone = "neutral", compact = false }: StatCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        toneClassMap[tone],
        compact ? "min-h-20" : "min-h-24",
      )}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-2 font-semibold text-foreground", compact ? "text-lg" : "text-2xl")}>{value}</p>
    </article>
  );
}
