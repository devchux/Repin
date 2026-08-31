import { Bot, Timer, Zap } from "@repo/ui/icons";

type ActivityDetailIcon = "bot" | "timer" | "zap";

const icons: Record<ActivityDetailIcon, typeof Timer> = {
  bot: Bot,
  timer: Timer,
  zap: Zap,
} as const;

export function ActivityDetailMetric({
  icon,
  label,
  value,
}: {
  icon: ActivityDetailIcon;
  label: string;
  value: string;
}) {
  const Icon = icons[icon];

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
