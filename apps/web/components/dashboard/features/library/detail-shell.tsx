import { WorkspacePage } from "@/components/dashboard/layout/workspace-page";
import { Button } from "@repo/ui/button";
import { ArrowLeft } from "@repo/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";

export function DetailShell({
  back,
  backLabel,
  icon,
  children,
  aside,
}: {
  readonly back: string;
  readonly backLabel: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly aside: ReactNode;
}) {
  return (
    <WorkspacePage>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-3 text-muted-foreground"
      >
        <Link href={back}>
          <ArrowLeft />
          Back to {backLabel}
        </Link>
      </Button>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article>{children}</article>
        <aside className="h-fit rounded-xl border bg-muted/20 p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
            {icon}
          </span>
          <div className="mt-5 divide-y">{aside}</div>
        </aside>
      </div>
    </WorkspacePage>
  );
}
