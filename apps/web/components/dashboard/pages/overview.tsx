import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Separator } from "@repo/ui/separator";
import {
  ArrowRight,
  Bookmark,
  Bot,
  ChevronRight,
  FileText,
  Globe2,
  Highlighter,
  Languages,
  MessageSquareText,
  Sparkles,
} from "@repo/ui/icons";
import Link from "next/link";

const stats = [
  {
    label: "Conversations",
    value: "12",
    detail: "3 this week",
    icon: MessageSquareText,
  },
  {
    label: "Saved items",
    value: "49",
    detail: "Across your library",
    icon: Bookmark,
  },
  {
    label: "Browser actions",
    value: "28",
    detail: "In the last 30 days",
    icon: Globe2,
  },
];
const activity = [
  {
    title: "Summarized a product strategy article",
    source: "hbr.org",
    time: "18 min ago",
    icon: Sparkles,
  },
  {
    title: "Saved a note about agent memory",
    source: "Repin note",
    time: "2 hours ago",
    icon: FileText,
  },
  {
    title: "Translated a selected paragraph",
    source: "medium.com",
    time: "Yesterday",
    icon: Languages,
  },
  {
    title: "Highlighted an authentication pattern",
    source: "github.com",
    time: "Yesterday",
    icon: Highlighter,
  },
];

export function OverviewPage() {
  return (
    <main className="mx-auto w-full max-w-360 p-4 md:p-6 lg:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Friday, August 29</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Good morning, Chukwudi
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick up where you left off or start something new with Repin.
          </p>
        </div>
        <Button className="w-fit shadow-none">
          <Bot aria-hidden="true" />
          Ask Repin
        </Button>
      </section>
      <section
        className="mt-6 grid gap-3 md:grid-cols-3"
        aria-label="Workspace summary"
      >
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-none">
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.detail}
                </p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-4" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden shadow-none">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Continue working</CardTitle>
                <CardDescription className="mt-1.5">
                  Your recent conversations and research.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/conversations">View all <ArrowRight aria-hidden="true" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Conversation</Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated 18 minutes ago
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  How should browser agent permissions work?
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  We outlined approval boundaries, resumable runs, and a typed
                  tool model for safe browser actions.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 bg-background"
                >
                  Continue conversation <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Actions completed across the web app and extension.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {activity.map((item, index) => (
                <div key={item.title}>
                  <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.source}
                      </p>
                    </div>
                    <time className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {item.time}
                    </time>
                  </div>
                  {index < activity.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/[0.035] shadow-none">
            <CardHeader>
              <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <CardTitle>What do you want to do?</CardTitle>
              <CardDescription>
                Repin can help with the page you are viewing or anything in your
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4">
              {[
                "Summarize the current page",
                "Find something I saved",
                "Turn highlights into notes",
              ].map((action) => (
                <button
                  key={action}
                  className="flex min-h-10 items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent"
                  type="button"
                >
                  {action}
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your library</CardTitle>
                <CardDescription className="mt-1.5">
                  Recently saved from the web.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/activity">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <LibraryItem
                icon={Bookmark}
                title="Designing effective AI agents"
                meta="openai.com"
              />
              <LibraryItem
                icon={Highlighter}
                title="Human approval in agent workflows"
                meta="anthropic.com"
              />
              <LibraryItem
                icon={FileText}
                title="Ideas for Repin memory"
                meta="Personal note"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function LibraryItem({
  icon: Icon,
  title,
  meta,
}: {
  icon: typeof Bookmark;
  title: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 text-left"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {meta}
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}
