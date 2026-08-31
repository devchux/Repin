export function ActivityMetric({
  label,
  value,
  detail,
  bordered = false,
}: {
  label: string;
  value: number;
  detail: string;
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${bordered ? "border-t sm:border-l sm:border-t-0" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium">{detail}</p>
      </div>
      <p className="font-mono text-2xl font-medium tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
