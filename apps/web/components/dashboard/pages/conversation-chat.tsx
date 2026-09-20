"use client";

import type {
  AssistantConversation,
  AssistantRun,
  CreateAssistantRunRequest,
  CreateConversationMessageRequest,
} from "@repo/contracts/assistant";
import { useQueryClient } from "@repo/client/query";
import { Button } from "@repo/ui/button";
import { ChatComposer } from "@repo/ui/chat-composer";
import { ChatMessage } from "@repo/ui/chat-message";
import { MessageSquareText, Sparkles } from "@repo/ui/icons";
import { TypingIndicator } from "@repo/ui/typing-indicator";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";
import { ChatSkeleton } from "../features/conversations/chat-skeleton";

const prompts = [
  "Summarize what I should know from this page",
  "Help me plan a focused research session",
  "Turn my saved highlights into an outline",
];

export function ConversationChat({
  conversationId,
}: {
  conversationId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const handledRunRef = useRef<string | undefined>(undefined);
  const [composerKey, setComposerKey] = useState(0);
  const [suggestedMessage, setSuggestedMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const conversationUrl = `/assistant/conversations/${conversationId ?? "unused"}`;
  const conversation = useFetch<AssistantConversation>(conversationUrl, {
    enabled: Boolean(conversationId),
    hideToast: "all",
  });
  const currentConversation = conversation.data?.data.data;
  const lastMessage = currentConversation?.messages.at(-1);
  const watchedRun = useFetch<AssistantRun>(
    lastMessage?.runId
      ? `/assistant/runs/${lastMessage.runId}`
      : "/assistant/runs/unused",
    {
      enabled: lastMessage?.role === "user" && Boolean(lastMessage.runId),
      hideToast: "all",
      refetchInterval: (query) => {
        const status = query.state.data?.data.data.status;
        return status && ["completed", "failed", "cancelled"].includes(status)
          ? false
          : 2_000;
      },
    },
  );
  const createRun = useSend<CreateAssistantRunRequest, AssistantRun>(
    "/assistant/runs",
    {
      hideToast: "all",
      onSuccess(response) {
        router.replace(`/conversations/${response.data.data.conversationId}`);
      },
    },
  );
  const sendMessage = useSend<CreateConversationMessageRequest, AssistantRun>(
    `${conversationUrl}/messages`,
    {
      hideToast: "all",
      onError() {
        setPendingMessage("");
      },
      onSuccess() {
        void queryClient
          .refetchQueries({ queryKey: ["base", conversationUrl] })
          .then(() => setPendingMessage(""));
      },
    },
  );
  const isSending = createRun.isPending || sendMessage.isPending;
  const watchedRunStatus = watchedRun.data?.data.data.status;
  const isResponding =
    isSending ||
    (lastMessage?.role === "user" &&
      (!watchedRunStatus ||
        !["completed", "failed", "cancelled"].includes(watchedRunStatus)));

  useEffect(() => {
    const run = watchedRun.data?.data.data;
    if (
      !run ||
      !["completed", "failed", "cancelled"].includes(run.status) ||
      handledRunRef.current === run.id
    ) {
      return;
    }
    handledRunRef.current = run.id;
    void conversation.refetch();
  }, [conversation, watchedRun.data]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      container.scrollTo({
        behavior: hasScrolledRef.current && !reduceMotion ? "smooth" : "auto",
        top: container.scrollHeight,
      });
      hasScrolledRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    currentConversation?.messages.length,
    isResponding,
    pendingMessage,
    conversationId,
  ]);

  function submit(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;
    setSuggestedMessage("");
    if (conversationId) {
      setPendingMessage(trimmed);
      sendMessage.mutate({ content: trimmed, executionLane: "short" });
      return;
    }
    createRun.mutate({
      capability: "chat",
      context: { url: window.location.href, title: "Repin web conversation" },
      input: trimmed,
      executionLane: "short",
    });
  }

  const title =
    currentConversation?.messages.find((message) => message.role === "user")
      ?.content ?? "New conversation";

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b bg-background/95 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            <p className="text-xs capitalize text-muted-foreground">
              {currentConversation?.initialCapability ?? "Repin conversation"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
          aria-live="polite"
        >
          {conversationId && conversation.isLoading ? <ChatSkeleton /> : null}
          {conversation.isError ? (
            <div className="flex min-h-full items-center justify-center py-10 text-center">
              <div>
                <p className="font-medium">This conversation could not be loaded.</p>
                <Button variant="outline" className="mt-4" onClick={() => void conversation.refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {!conversationId ? (
            <div className="flex min-h-full items-center justify-center py-10 text-center">
              <div className="w-full max-w-2xl">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">What can I help you with?</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Ask a question, explore an idea, or start a task that can continue across Repin.
                </p>
                <div className="mt-7 grid gap-2 text-left sm:grid-cols-3">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setSuggestedMessage(prompt);
                        setComposerKey((value) => value + 1);
                      }}
                      className="rounded-xl border bg-background p-4 text-sm leading-5 transition-colors hover:bg-muted/50 active:scale-[0.98]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentConversation ? (
            <div className="space-y-3 py-6">
              {currentConversation.messages.map((item) => (
                <ChatMessage key={item.id} content={item.content} role={item.role} />
              ))}
              {pendingMessage ? <ChatMessage content={pendingMessage} role="user" /> : null}
              {isResponding ? <TypingIndicator label="Repin is typing" /> : null}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t bg-muted/25 px-3 pb-3 pt-2.5 md:px-6 md:pb-5">
          <ChatComposer
            key={composerKey}
            disabled={isResponding}
            initialContent={suggestedMessage}
            placeholder={conversationId ? "Ask for follow-up changes" : "Message Repin"}
            onSend={submit}
          />
        </div>
      </div>
    </main>
  );
}
