import { Highlighter } from "@repo/ui/icons";

export function EmptyHighlights({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <Highlighter className="mx-auto size-7 text-muted-foreground" />
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
