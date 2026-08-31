"use client";

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
import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceItems = [
  { label: "Overview", icon: LayoutDashboard, link: "/overview" },
  { label: "Conversations", icon: MessageSquareText, link: "/conversations" },
  { label: "Activity", icon: Clock3, link: "/activity" },
] as const;

const libraryItems = [
  { label: "Bookmarks", icon: Bookmark, count: 18, link: "/bookmarks" },
  { label: "Notes", icon: FileText, count: 7, link: "/notes" },
  { label: "Highlights", icon: Highlighter, count: 24, link: "/highlights" },
] as const;

export function DashboardSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: {
  readonly collapsed: boolean;
  readonly mobileOpen: boolean;
  readonly onCloseMobile: () => void;
  readonly onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      id="dashboard-navigation"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-68 shrink-0 -translate-x-full flex-col border-r bg-sidebar p-3 shadow-2xl transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:shadow-none",
        mobileOpen && "translate-x-0",
        collapsed && "lg:w-20",
      )}
    >
      <div className={cn("flex h-12 items-center px-2", collapsed ? "lg:justify-center lg:px-0" : "justify-between")}>
        <Link href="/overview" className={cn("flex min-w-0 items-center gap-2.5 font-semibold", collapsed && "lg:hidden")} onClick={onCloseMobile}>
          <Image
            src="/images/repin-logo-icon.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 object-contain"
            priority
          />
          <span className={cn("truncate tracking-tight", collapsed && "lg:hidden")}>Repin AI</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground lg:hidden"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        >
          <PanelLeftClose aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-8 text-muted-foreground lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <PanelLeftClose className={cn("transition-transform", collapsed && "rotate-180")} aria-hidden="true" />
        </Button>
      </div>

      <Button asChild className={cn("mt-4 shadow-none", collapsed ? "lg:size-10 lg:p-0" : "w-full justify-start")}>
        <Link href="/conversations/new" onClick={onCloseMobile} title={collapsed ? "New conversation" : undefined}>
          <Bot aria-hidden="true" />
          <span className={cn(collapsed && "lg:hidden")}>New conversation</span>
        </Link>
      </Button>

      <nav className="mt-6 flex-1 space-y-6" aria-label="Dashboard navigation">
        <NavigationGroup label="Workspace" items={workspaceItems} pathname={pathname} collapsed={collapsed} onNavigate={onCloseMobile} />
        <NavigationGroup label="Library" items={libraryItems} pathname={pathname} collapsed={collapsed} onNavigate={onCloseMobile} />
      </nav>

      <div className={cn("rounded-xl border border-primary/15 bg-primary/[0.045] p-3", collapsed && "lg:flex lg:justify-center lg:border-0 lg:bg-transparent lg:p-0")}>
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div className={cn(collapsed && "lg:hidden")}>
            <p className="text-sm font-medium">Browser connected</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Ready to work with your open tabs.</p>
          </div>
        </div>
      </div>

      <Link
        href="/settings"
        onClick={onCloseMobile}
        title={collapsed ? "Settings" : undefined}
        aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        className={cn(
          "mt-2 flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
          pathname.startsWith("/settings") ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <Settings className="size-4 shrink-0" aria-hidden="true" />
        <span className={cn(collapsed && "lg:hidden")}>Settings</span>
      </Link>
    </aside>
  );
}

type NavigationItem = {
  readonly label: string;
  readonly icon: typeof LayoutDashboard;
  readonly count?: number;
  readonly link: string;
};

function NavigationGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  readonly label: string;
  readonly items: readonly NavigationItem[];
  readonly pathname: string;
  readonly collapsed: boolean;
  readonly onNavigate: () => void;
}) {
  return (
    <div>
      <p className={cn("mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80", collapsed && "lg:sr-only")}>{label}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.link || pathname.startsWith(`${item.link}/`);
          return (
            <Link
              key={item.label}
              href={item.link}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active ? "bg-background font-medium text-foreground shadow-xs ring-1 ring-border/70" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                collapsed && "lg:justify-center lg:px-0",
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
              <span className={cn("flex-1", collapsed && "lg:hidden")}>{item.label}</span>
              {item.count ? <span className={cn("text-xs tabular-nums text-muted-foreground", collapsed && "lg:hidden")}>{item.count}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
