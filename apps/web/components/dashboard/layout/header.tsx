import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import { Bell, Menu, Search } from "@repo/ui/icons";

export function DashboardHeader({
  onOpenNavigation,
}: {
  readonly onOpenNavigation: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-9 lg:hidden"
        aria-label="Open navigation"
        aria-controls="dashboard-navigation"
        onClick={onOpenNavigation}
      >
        <Menu aria-hidden="true" />
      </Button>
      <button
        className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/35 px-3 text-left text-sm text-muted-foreground shadow-xs transition-colors hover:border-foreground/15 hover:bg-muted/60 md:max-w-md"
        type="button"
      >
        <Search className="size-4 shrink-0 transition-colors group-hover:text-foreground" aria-hidden="true" />
        <span className="truncate">Search conversations, pages, and notes</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] shadow-xs sm:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell aria-hidden="true" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-background" />
        </Button>
        <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Open account menu">
          <Avatar className="size-8 border bg-background">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">CO</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
