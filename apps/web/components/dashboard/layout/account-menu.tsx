"use client";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { LoaderCircle, LogOut, Settings } from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import Link from "next/link";
import { useState } from "react";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const profile = useProfile();
  const { isLoggingOut, logout } = useAuth();
  const user = profile.data?.data.data;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "R";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Repin user";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-2 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          aria-label="Open account menu"
          aria-expanded={open}
        >
          <Avatar className="size-8 border bg-background">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} role="menu" className="w-64 rounded-xl p-1.5">
        <div className="px-2.5 py-2">
          {profile.isLoading ? (
            <div className="space-y-2">
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</p>
            </>
          )}
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          href="/settings"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
          Settings
        </Link>
        <button
          type="button"
          role="menuitem"
          disabled={isLoggingOut}
          onClick={logout}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
        >
          {isLoggingOut ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
          {isLoggingOut ? "Logging out" : "Log out"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
