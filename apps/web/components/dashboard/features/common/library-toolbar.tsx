"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Grid2X2, List, Search } from "@repo/ui/icons";

export function LibraryToolbar({ query, onQueryChange, placeholder, layout, onLayoutChange, children }: { readonly query: string; readonly onQueryChange: (value: string) => void; readonly placeholder: string; readonly layout?: "grid" | "list"; readonly onLayoutChange?: (value: "grid" | "list") => void; readonly children?: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-y py-4 md:flex-row md:items-center">
      <label className="relative block min-w-0 flex-1 md:max-w-md">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input className="h-10 bg-background pl-9 shadow-none" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
      </label>
      <div className="flex items-center gap-2 overflow-x-auto">
        {children}
        {layout && onLayoutChange ? <div className="ml-auto flex rounded-md border bg-background p-0.5 md:ml-1">
          <Button size="icon" variant={layout === "grid" ? "secondary" : "ghost"} className="size-8 shadow-none" onClick={() => onLayoutChange("grid")} aria-label="Grid view"><Grid2X2 /></Button>
          <Button size="icon" variant={layout === "list" ? "secondary" : "ghost"} className="size-8 shadow-none" onClick={() => onLayoutChange("list")} aria-label="List view"><List /></Button>
        </div> : null}
      </div>
    </div>
  );
}
