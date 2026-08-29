import { Button } from "@repo/ui/button";
import {
  Bookmark,
  Bot,
  Clock3,
  FileText,
  Highlighter,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  Settings,
  Sparkles,
} from "@repo/ui/icons";
import Link from "next/link";

const workspaceItems = [
  { label: "Overview", icon: LayoutDashboard, active: true, link: "/overview" },
  { label: "Conversations", icon: MessageSquareText, link: "#" },
  { label: "Activity", icon: Clock3, link: "#" },
];
const libraryItems = [
  { label: "Bookmarks", icon: Bookmark, count: 18, link: "#" },
  { label: "Notes", icon: FileText, count: 7, link: "#" },
  { label: "Highlights", icon: Highlighter, count: 24, link: "#" },
];

export function DashboardSidebar() {
  return (
    <aside className="hidden h-full w-64 shrink-0 border-r bg-sidebar p-3 lg:flex lg:flex-col">
      <div className="flex h-12 items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span>Repin AI</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose aria-hidden="true" />
        </Button>
      </div>
      <Button className="mt-4 w-full justify-start shadow-none">
        <Bot aria-hidden="true" />
        New conversation
      </Button>
      <nav className="mt-6 flex-1 space-y-6" aria-label="Dashboard navigation">
        <NavigationGroup label="Workspace" items={workspaceItems} />
        <NavigationGroup label="Library" items={libraryItems} />
      </nav>
      <div className="rounded-xl border bg-background p-3">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">Browser connected</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Repin can work with your open tabs.
            </p>
          </div>
        </div>
      </div>
      <Link
        href="/settings"
        className="mt-2 flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Settings className="size-4" aria-hidden="true" />
        Settings
      </Link>
    </aside>
  );
}

type NavigationItem = {
  readonly label: string;
  readonly icon: typeof LayoutDashboard;
  readonly active?: boolean;
  readonly count?: number;
  readonly link: string;
};

function NavigationGroup({
  label,
  items,
}: {
  label: string;
  items: readonly NavigationItem[];
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.link}
            aria-current={item.active ? "page" : undefined}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${item.active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            <item.icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.count ? (
              <span className="text-xs tabular-nums">{item.count}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
