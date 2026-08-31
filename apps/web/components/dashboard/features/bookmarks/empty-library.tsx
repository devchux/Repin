import { Bookmark } from "@repo/ui/icons";

export function EmptyLibrary({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
      <Bookmark className="size-6 text-muted-foreground" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
