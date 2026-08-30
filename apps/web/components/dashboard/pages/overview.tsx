import { SectionHeader } from "@/components/dashboard/features/overview/section-header";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  ArrowRight,
  Bookmark,
  Bot,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  Highlighter,
  Languages,
  MessageSquareText,
  Search,
  Sparkles,
  Wifi,
} from "@repo/ui/icons";
import Link from "next/link";
import { WorkspacePage } from "../layout/workspace-page";

const stats = [
  { label: "Conversations", value: "12", detail: "3 this week", icon: MessageSquareText },
  { label: "Saved items", value: "49", detail: "Across your library", icon: Bookmark },
  { label: "Browser actions", value: "28", detail: "Last 30 days", icon: Globe2 },
] as const;

const activity = [
  { title: "Summarized a product strategy article", source: "hbr.org", time: "18 min ago", icon: Sparkles },
  { title: "Saved a note about agent memory", source: "Repin note", time: "2 hours ago", icon: FileText },
  { title: "Translated a selected paragraph", source: "medium.com", time: "Yesterday", icon: Languages },
  { title: "Highlighted an authentication pattern", source: "github.com", time: "Yesterday", icon: Highlighter },
] as const;

const library = [
  { icon: Bookmark, title: "Designing effective AI agents", meta: "openai.com" },
  { icon: Highlighter, title: "Human approval in agent workflows", meta: "anthropic.com" },
  { icon: FileText, title: "Ideas for Repin memory", meta: "Personal note" },
] as const;

export function OverviewPage() {
  return (
    <WorkspacePage>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Your workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-[2rem]">Good morning, Chukwudi</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Continue your research, work with an open tab, or start a new conversation.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          Sunday, August 30
        </div>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.03),0_10px_30px_oklch(0_0_0/0.025)]">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <button type="button" className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border bg-muted/30 px-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:bg-muted/50">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Ask Repin to research, explain, organize, or act on the web</span>
          </button>
          <Button asChild className="shrink-0 shadow-none">
            <Link href="/conversations/new">Start conversation <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
        <div className="grid border-t bg-muted/18 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`flex items-center gap-4 px-5 py-4 ${index ? "border-t sm:border-l sm:border-t-0" : ""}`}>
              <stat.icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 text-sm font-medium">{stat.detail}</p>
              </div>
              <p className="font-mono text-xl font-medium tabular-nums tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.72fr)]">
        <div className="space-y-7">
          <section className="rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]">
            <SectionHeader title="Continue working" description="Your most recent conversation" href="/conversations" />
            <div className="border-t p-3 md:p-4">
              <Link href="/conversations" className="group block rounded-xl p-3 transition-colors hover:bg-muted/45 md:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-md font-normal">Conversation</Badge>
                  <span className="text-xs text-muted-foreground">Updated 18 minutes ago</span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">How should browser agent permissions work?</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Approval boundaries, resumable runs, and typed tools for safe browser actions.</p>
                  </div>
                  <span className="hidden size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:flex">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]">
            <SectionHeader title="Recent activity" description="Actions from the web app and extension" href="/activity" />
            <div className="border-t px-4 md:px-5">
              {activity.map((item) => (
                <div key={item.title} className="group flex items-center gap-3 border-b py-4 last:border-b-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors group-hover:text-foreground">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.source}</p>
                  </div>
                  <time className="hidden shrink-0 text-xs text-muted-foreground sm:block">{item.time}</time>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-7">
          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]">
            <div className="border-b bg-primary/5.5 p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Wifi className="size-4" aria-hidden="true" /></span>
                <span className="rounded-full border border-primary/20 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-primary">Connected</span>
              </div>
              <h2 className="mt-5 font-semibold tracking-tight">Chrome on this Mac</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Repin can work with the page in your active tab.</p>
            </div>
            <div className="grid gap-1 p-2">
              {["Summarize the current page", "Turn highlights into notes", "Explain selected text"].map((action) => (
                <button key={action} type="button" className="flex min-h-10 items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-muted">
                  {action}<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]">
            <SectionHeader title="Recently saved" description="From your library" href="/bookmarks" />
            <div className="border-t p-2">
              {library.map((item) => (
                <Link key={item.title} href="/bookmarks" className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground group-hover:text-primary"><item.icon className="size-3.5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </WorkspacePage>
  );
}
