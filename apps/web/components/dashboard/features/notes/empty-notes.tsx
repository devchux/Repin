import { FileText } from "@repo/ui/icons";

export function EmptyNotes({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
      <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
