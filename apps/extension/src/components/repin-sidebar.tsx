import { useState } from "react";
import { Pin, Square, X, ArrowUp, ChevronDown, Mic } from "lucide-react";

import { Button } from "@repo/ui/button";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { cn } from "@repo/ui/lib/utils";
import {
  modeConfig,
  REPIN_SIDEBAR_MAX_WIDTH,
  REPIN_SIDEBAR_VIEWPORT_GAP,
} from "@/lib/constants";
import type { RepinSidebarMode } from "@/types";
import PersonalityControl from "./personality-control";
import { PERSONALITIES, Personality } from "@/types/sidebar";

interface RepinSidebarProps {
  mode: RepinSidebarMode;
  open: boolean;
  page: {
    title: string;
    url: string;
  };
  pinned: boolean;
  selectedText: string;
  onClose: () => void;
  onPinnedChange: (pinned: boolean) => void;
}

export const RepinSidebar = ({
  mode,
  open,
  page,
  pinned,
  selectedText,
  onClose,
  onPinnedChange,
}: RepinSidebarProps) => {
  const [personality, setPersonality] = useState<Personality>("Curious");
  const [personalityOpen, setPersonalityOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const config = modeConfig[mode];
  const Icon = config.icon;
  const hasSelection = selectedText.length > 0;

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed right-0 top-0 z-2147483647 flex h-dvh translate-x-full flex-col border-l border-neutral-200 bg-white text-neutral-950 shadow-2xl shadow-neutral-950/20 transition-transform duration-200 ease-out dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:shadow-neutral-950/40",
        pinned && "shadow-none dark:shadow-none",
        open && "translate-x-0",
      )}
      style={{
        width: `min(${REPIN_SIDEBAR_MAX_WIDTH}px, calc(100vw - ${REPIN_SIDEBAR_VIEWPORT_GAP}px))`,
      }}
    >
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex min-h-16 items-center justify-between px-4">
          <button
            className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
            type="button"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-base font-semibold">
                  {config.title}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 text-neutral-500 dark:text-neutral-400"
                />
              </span>
              <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                {page.title || "Current page"}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1">
            <Button
              aria-label={pinned ? "Unpin Repin sidebar" : "Pin Repin sidebar"}
              aria-pressed={pinned}
              className={cn(
                "size-9",
                pinned && "bg-primary text-white hover:bg-primary",
              )}
              size="icon"
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
              variant="ghost"
              onClick={() => onPinnedChange(!pinned)}
            >
              <Pin aria-hidden="true" />
            </Button>
            <Button
              aria-label="Close Repin sidebar"
              className="size-9"
              size="icon"
              title="Close"
              variant="ghost"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <section className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            Selected text
          </h2>

          <div className="mt-4 space-y-3">
            <p className="line-clamp-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
              {hasSelection ? selectedText : "No selected text available."}
            </p>
            <p className="break-all text-xs text-neutral-500 dark:text-neutral-400">
              {page.url}
            </p>
          </div>
        </section>

        <section className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                {config.description}
              </p>
              <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {config.emptyState}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
        {recording ? (
          <div className="flex items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <PersonalityControl
              chevron="down"
              open={personalityOpen}
              setOpen={setPersonalityOpen}
              personality={personality}
              personalities={PERSONALITIES}
              setPersonality={setPersonality}
            />

            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-neutral-100 px-3 dark:bg-neutral-950">
              <Square
                aria-hidden="true"
                className="size-3 fill-red-600 text-red-600"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                Listening...
              </span>
              <button
                aria-label="Cancel recording"
                className="shrink-0 rounded-full p-1 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                type="button"
                onClick={() => setRecording(false)}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <Button
              aria-label="Send message"
              className="size-12 shrink-0 rounded-full"
              size="icon"
              title="Send"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <RichTextEditor
              className="border-0 bg-transparent ring-offset-transparent focus-within:ring-0 focus-within:ring-offset-0 dark:bg-transparent"
              contentClassName="px-3 py-2 text-sm leading-5"
              editorClassName="text-sm"
              minHeightClassName="min-h-12"
              placeholder="Ask for follow-up changes"
              showToolbar={false}
            />

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PersonalityControl
                  chevron="up"
                  open={personalityOpen}
                  setOpen={setPersonalityOpen}
                  personality={personality}
                  personalities={PERSONALITIES}
                  setPersonality={setPersonality}
                />
                <Button
                  aria-label="Start audio recording"
                  className="size-9 rounded-full text-neutral-500 dark:text-neutral-400"
                  size="icon"
                  title="Record audio"
                  variant="ghost"
                  onClick={() => {
                    setPersonalityOpen(false);
                    setRecording(true);
                  }}
                >
                  <Mic aria-hidden="true" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  aria-label="Send message"
                  className="size-9 rounded-full"
                  size="icon"
                  title="Send"
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </footer>
    </aside>
  );
};
