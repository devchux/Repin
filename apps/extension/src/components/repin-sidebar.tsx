import { X } from "lucide-react";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

interface RepinSidebarProps {
  open: boolean;
  page: {
    title: string;
    url: string;
  };
  onClose: () => void;
}

export function RepinSidebar({ open, page, onClose }: RepinSidebarProps) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed right-0 top-0 z-2147483647 flex h-dvh w-[min(400px,calc(100vw-24px))] translate-x-full flex-col border-l border-neutral-200 bg-white text-neutral-950 shadow-2xl shadow-neutral-950/20 transition-transform duration-200 ease-out dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:shadow-neutral-950/40",
        open && "translate-x-0",
      )}
    >
      <header className="flex min-h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Repin</h1>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            Save this page
          </p>
        </div>
        <Button
          aria-label="Close Repin sidebar"
          size="icon"
          title="Close"
          variant="ghost"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <section className="space-y-2">
          <label
            className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
            htmlFor="repin-title"
          >
            Title
          </label>
          <input
            className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none ring-offset-white transition focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300"
            defaultValue={page.title}
            id="repin-title"
          />
        </section>

        <section className="space-y-2">
          <label
            className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
            htmlFor="repin-note"
          >
            Note
          </label>
          <textarea
            className="min-h-32 w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none ring-offset-white transition focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300"
            id="repin-note"
            placeholder="Add context, thoughts, or a quick reminder."
          />
        </section>

        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="break-all text-xs text-neutral-500 dark:text-neutral-400">
            {page.url}
          </p>
        </section>
      </main>

      <footer className="flex items-center justify-end gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Save pin</Button>
      </footer>
    </aside>
  );
}
