import { Button } from "@repo/ui/button";
import { ArrowRight } from "@repo/ui/icons";
import Link from "next/link";

export function SectionHeader({
  title,
  description,
  href,
}: {
  readonly title: string;
  readonly description: string;
  readonly href: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-mr-2 h-8 text-xs text-muted-foreground"
      >
        <Link href={href}>
          View all <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
