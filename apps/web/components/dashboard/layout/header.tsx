import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import { Bell, Menu, Search } from "@repo/ui/icons";

export function DashboardHeader() {
  return (
    <header className="flex sticky top-0 h-16 items-center gap-3 border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </Button>
      <button
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted md:max-w-sm"
        type="button"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search your workspace</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell aria-hidden="true" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </Button>
        <Avatar>
          <AvatarFallback>CO</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
