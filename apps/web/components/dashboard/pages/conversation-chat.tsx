"use client";

import type {
  AssistantConversation,
  AssistantConversationMessage,
  AssistantRun,
  BrowserActionApproval,
  CreateAssistantRunRequest,
  CreateConversationMessageRequest,
} from "@repo/contracts/assistant";
import { useQueryClient } from "@repo/client/query";
import { Button } from "@repo/ui/button";
import { ChatComposer } from "@repo/ui/chat-composer";
import { ChatMessage } from "@repo/ui/chat-message";
import { Sparkles } from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";
import { useAssistantRunStream } from "@/hooks/useAssistantRunStream";
import { api } from "@/lib/api";
import { ChatSkeleton } from "../features/conversations/chat-skeleton";
import { ConversationHeader } from "../features/conversations/conversation-header";
import { RunFeedback } from "../features/conversations/run-feedback";
import { RunTimeline } from "../features/conversations/run-timeline";

const prompts = [
  "Summarize what I should know from this page",
  "Help me plan a focused research session",
  "Turn my saved highlights into an outline",
];

const terminalRunStatuses = new Set(["completed", "failed", "cancelled"]);

function newestRun(
  streamed?: AssistantRun,
  polled?: AssistantRun,
): AssistantRun | undefined {
  if (!streamed) return polled;
  if (!polled) return streamed;
  if (terminalRunStatuses.has(polled.status)) return polled;
  if (terminalRunStatuses.has(streamed.status)) return streamed;
  return new Date(polled.updatedAt) > new Date(streamed.updatedAt)
    ? polled
    : streamed;
}

export function ConversationChat({
  conversationId,
}: {
  conversationId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const handledRunRef = useRef<string | undefined>(undefined);
  const [composerKey, setComposerKey] = useState(0);
  const [suggestedMessage, setSuggestedMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([]);
  const [messageCursor, setMessageCursor] = useState<string>();
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState(false);
  const loadedConversationRef = useRef<string | undefined>(undefined);
  const loadedOlderMessagesRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | undefined>(
    undefined,
  );
  const conversationUrl = `/assistant/conversations/${conversationId ?? "unused"}`;
  const conversation = useFetch<AssistantConversation>(conversationUrl, {
    enabled: Boolean(conversationId),
    hideToast: "all",
  });
  const currentConversation = conversation.data?.data.data;
  const lastMessage = messages.at(-1);
  const streamingRunId =
    lastMessage?.role === "user" ? lastMessage.runId : undefined;
  const runStream = useAssistantRunStream(streamingRunId);
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
          : runStream.connected
            ? 5_000
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
  const currentRun = streamingRunId
    ? newestRun(runStream.run, watchedRun.data?.data.data)
    : undefined;
  const watchedRunStatus = currentRun?.status;
  const approvals = useFetch<BrowserActionApproval[]>(
    currentRun
      ? `/assistant/runs/${currentRun.id}/approvals`
      : "/assistant/runs/unused/approvals",
    {
      enabled: currentRun?.status === "awaiting_approval",
      hideToast: "all",
    },
  );
  const pendingApproval = approvals.data?.data.data[0];
  const cancelRun = useSend<Record<string, never>>(
    currentRun
      ? `/assistant/runs/${currentRun.id}/cancel`
      : "/assistant/runs/unused/cancel",
    {
      hideToast: "all",
      onSuccess: () => void watchedRun.refetch(),
    },
  );
  const resumeRun = useSend<Record<string, never>>(
    currentRun
      ? `/assistant/runs/${currentRun.id}/resume`
      : "/assistant/runs/unused/resume",
    {
      hideToast: "all",
      onSuccess: () => void watchedRun.refetch(),
    },
  );
  const approveAction = useSend<Record<string, never>>(
    currentRun && pendingApproval
      ? `/assistant/runs/${currentRun.id}/approvals/${pendingApproval.id}/approve`
      : "/assistant/runs/unused/approvals/unused/approve",
    {
      hideToast: "all",
      onSuccess: () => {
        void approvals.refetch();
        void watchedRun.refetch();
      },
    },
  );
  const denyAction = useSend<Record<string, never>>(
    currentRun && pendingApproval
      ? `/assistant/runs/${currentRun.id}/approvals/${pendingApproval.id}/deny`
      : "/assistant/runs/unused/approvals/unused/deny",
    {
      hideToast: "all",
      onSuccess: () => {
        void approvals.refetch();
        void watchedRun.refetch();
      },
    },
  );
  const isResponding =
    isSending ||
    (lastMessage?.role === "user" &&
      (!watchedRunStatus ||
        !["completed", "failed", "cancelled"].includes(watchedRunStatus)));

  useEffect(() => {
    const run = currentRun;
    if (
      !run ||
      !["completed", "failed", "cancelled"].includes(run.status) ||
      handledRunRef.current === run.id
    ) {
      return;
    }
    handledRunRef.current = run.id;
    void conversation.refetch();
  }, [conversation, currentRun]);

  useEffect(() => {
    if (!currentConversation) return;
    const isNewConversation =
      loadedConversationRef.current !== currentConversation.id;
    if (isNewConversation) {
      loadedConversationRef.current = currentConversation.id;
      loadedOlderMessagesRef.current = false;
      setMessages([...currentConversation.messages]);
      setMessageCursor(currentConversation.messagePage.nextCursor);
      setHasOlderMessages(currentConversation.messagePage.hasMore);
      return;
    }
    setMessages((existing) => {
      const byId = new Map(existing.map((message) => [message.id, message]));
      for (const message of currentConversation.messages)
        byId.set(message.id, message);
      return [...byId.values()].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );
    });
    if (!loadedOlderMessagesRef.current) {
      setMessageCursor(currentConversation.messagePage.nextCursor);
      setHasOlderMessages(currentConversation.messagePage.hasMore);
    }
  }, [currentConversation]);

  useLayoutEffect(() => {
    const restore = scrollRestoreRef.current;
    const container = scrollRef.current;
    if (!restore || !container) return;
    container.scrollTop =
      restore.top + (container.scrollHeight - restore.height);
    scrollRestoreRef.current = undefined;
  }, [messages.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (
        !container ||
        (!shouldAutoScrollRef.current && hasScrolledRef.current)
      )
        return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      container.scrollTo({
        behavior:
          hasScrolledRef.current && !reduceMotion && !runStream.content
            ? "smooth"
            : "auto",
        top: container.scrollHeight,
      });
      hasScrolledRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    messages.length,
    isResponding,
    pendingMessage,
    runStream.content,
    conversationId,
  ]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    hasScrolledRef.current = false;
  }, [conversationId]);

  async function loadOlderMessages() {
    const container = scrollRef.current;
    if (!conversationId || !messageCursor || !container || loadingOlderMessages)
      return;
    setLoadingOlderMessages(true);
    setOlderMessagesError(false);
    try {
      const response = await api.get<AssistantConversation>(
        "base",
        conversationUrl,
        { before: messageCursor, limit: 50 },
      );
      scrollRestoreRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
      };
      loadedOlderMessagesRef.current = true;
      setMessages((existing) => {
        const byId = new Map(existing.map((message) => [message.id, message]));
        for (const message of response.data.data.messages)
          byId.set(message.id, message);
        return [...byId.values()].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        );
      });
      setMessageCursor(response.data.data.messagePage.nextCursor);
      setHasOlderMessages(response.data.data.messagePage.hasMore);
    } catch {
      setOlderMessagesError(true);
    } finally {
      setLoadingOlderMessages(false);
    }
  }

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
    messages.find((message) => message.role === "user")?.content ??
    "New conversation";

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background">
      <ConversationHeader
        capability={currentConversation?.initialCapability}
        context={currentConversation?.context}
        title={title}
      />

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
          aria-live="polite"
          onScroll={(event) => {
            const target = event.currentTarget;
            shouldAutoScrollRef.current =
              target.scrollHeight - target.scrollTop - target.clientHeight <
              120;
          }}
        >
          {conversationId && conversation.isLoading ? <ChatSkeleton /> : null}
          {conversation.isError ? (
            <div className="flex min-h-full items-center justify-center py-10 text-center">
              <div>
                <p className="font-medium">
                  This conversation could not be loaded.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void conversation.refetch()}
                >
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
                <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
                  What can I help you with?
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Ask a question, explore an idea, or start a task that can
                  continue across Repin.
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
            <div className="space-y-5 py-5 sm:py-7">
              {hasOlderMessages ? (
                <div className="flex flex-col items-center gap-1 pb-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={loadingOlderMessages}
                    onClick={() => void loadOlderMessages()}
                  >
                    {loadingOlderMessages
                      ? "Loading earlier messages..."
                      : "Load earlier messages"}
                  </Button>
                  {olderMessagesError ? (
                    <p className="text-xs text-destructive" role="alert">
                      Earlier messages could not be loaded. Try again.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {messages.map((item) => (
                <ChatMessage
                  key={item.id}
                  content={item.content}
                  role={item.role}
                />
              ))}
              {pendingMessage ? (
                <ChatMessage content={pendingMessage} role="user" pending />
              ) : null}
              {runStream.content ? (
                <ChatMessage
                  content={runStream.content}
                  role="assistant"
                  pending
                />
              ) : null}
              {currentRun ? (
                <RunTimeline
                  liveEvents={runStream.events}
                  runId={currentRun.id}
                  runStatus={currentRun.status}
                />
              ) : null}
              {currentRun ? (
                <RunFeedback
                  approval={pendingApproval}
                  approving={approveAction.isPending}
                  denying={denyAction.isPending}
                  resuming={resumeRun.isPending}
                  run={currentRun}
                  onApprove={
                    pendingApproval ? () => approveAction.mutate({}) : undefined
                  }
                  onDeny={
                    pendingApproval ? () => denyAction.mutate({}) : undefined
                  }
                  onResume={
                    currentRun.status === "suspended"
                      ? () => resumeRun.mutate({})
                      : undefined
                  }
                  onRetry={
                    currentRun.status === "failed" ||
                    currentRun.status === "cancelled"
                      ? () => submit(lastMessage?.content ?? "")
                      : undefined
                  }
                />
              ) : isResponding ? (
                <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                  <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                  Starting response
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <ChatComposer
          key={composerKey}
          disabled={isResponding}
          initialContent={suggestedMessage}
          isSending={isResponding}
          placeholder={
            conversationId ? "Ask for follow-up changes" : "Message Repin"
          }
          statusLabel={
            currentRun && isResponding
              ? currentRun.phase === "executing"
                ? "Repin is using browser tools"
                : "Repin is working"
              : undefined
          }
          onCancel={
            currentRun &&
            ["queued", "running", "awaiting_approval", "suspended"].includes(
              currentRun.status,
            )
              ? () => cancelRun.mutate({})
              : undefined
          }
          onSend={submit}
        />
      </div>
    </main>
  );
}
