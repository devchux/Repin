import type { PageContext } from "@repo/contracts/browser";
import { Button } from "@repo/ui/button";
import { ArrowLeft, ExternalLink, Globe2, MessageSquareText } from "@repo/ui/icons";
import Link from "next/link";

export function ConversationHeader({
  capability,
  context,
  title,
}: {
  readonly capability?: string;
  readonly context?: PageContext;
  readonly title: string;
}) {
  const isExternalContext = context?.url?.startsWith("http");

  return (
    <header className="shrink-0 border-b bg-background/95 px-3 py-2.5 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-4xl items-center gap-2 sm:gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0">
          <Link href="/conversations" aria-label="Back to conversations">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
          <MessageSquareText className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {capability ?? "Repin conversation"}
          </p>
        </div>
        {context?.url ? (
          isExternalContext ? (
            <Button asChild variant="ghost" size="sm" className="min-w-0 max-w-48 gap-2 px-2 text-muted-foreground">
              <a href={context.url} target="_blank" rel="noreferrer" title={context.title || context.url}>
                <Globe2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate md:inline">{context.title || new URL(context.url).hostname}</span>
                <ExternalLink className="hidden size-3.5 shrink-0 md:block" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <span className="hidden max-w-48 items-center gap-2 truncate text-xs text-muted-foreground md:flex" title={context.title}>
              <Globe2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{context.title || "Web workspace"}</span>
            </span>
          )
        ) : null}
      </div>
    </header>
  );
}
