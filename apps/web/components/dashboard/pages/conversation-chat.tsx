"use client";

import type {
  AssistantConversation,
  AssistantRun,
  CreateAssistantRunRequest,
  CreateConversationMessageRequest,
} from "@repo/contracts/assistant";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import {
  Bot,
  MessageSquareText,
  Paperclip,
  Send,
  Sparkles,
} from "@repo/ui/icons";
import { useQueryClient } from "@repo/client/query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

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
  const [message, setMessage] = useState("");
  const conversation = useFetch<AssistantConversation>(
    conversationId
      ? `/assistant/conversations/${conversationId}`
      : "/assistant/conversations/unused",
    { enabled: Boolean(conversationId), hideToast: "all" },
  );
  const currentConversation = conversation.data?.data.data;
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
    `/assistant/conversations/${conversationId ?? "unused"}/messages`,
    {
      hideToast: "all",
      onSuccess() {
        setMessage("");
        void queryClient.invalidateQueries({
          queryKey: ["base", `/assistant/conversations/${conversationId}`],
        });
      },
    },
  );
  const isSending = createRun.isPending || sendMessage.isPending;

  function submit(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;
    if (conversationId) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(message);
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="border-b bg-background/95 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {currentConversation?.messages[0]?.content ?? "New conversation"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Repin AI · Browser context available
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 md:px-6">
        {conversationId && conversation.isLoading ? <ChatSkeleton /> : null}
        {conversation.isError ? (
          <div className="m-auto text-center">
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
        ) : null}
        {!conversationId ? (
          <div className="m-auto w-full max-w-2xl py-10 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
              What can I help you with?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Ask a question, explore an idea, or start a task that can continue
              across Repin.
            </p>
            <div className="mt-7 grid gap-2 text-left sm:grid-cols-3">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="rounded-xl border bg-background p-4 text-sm leading-5 transition-colors hover:bg-muted/50 active:scale-[0.98]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {currentConversation ? (
          <div className="flex-1 space-y-6 py-8">
            {currentConversation.messages.map((item) =>
              item.role === "user" ? (
                <div
                  key={item.id}
                  className="ml-auto flex max-w-2xl justify-end gap-3"
                >
                  <div className="rounded-xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                    {item.content}
                  </div>
                  <Avatar className="mt-0.5 size-8">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div key={item.id} className="flex max-w-2xl gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-4" aria-hidden="true" />
                  </span>
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {item.content}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 mt-auto bg-background pb-4 pt-3 md:pb-6"
        >
          <div className="rounded-xl border bg-background p-2 shadow-[0_-8px_30px_-20px_oklch(0.2_0_0/0.3)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
            <label htmlFor="message" className="sr-only">
              Message Repin
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(message);
                }
              }}
              placeholder="Message Repin…"
              rows={3}
              disabled={isSending}
              className="max-h-40 min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground"
                aria-label="Attach context"
              >
                <Paperclip aria-hidden="true" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="size-9 active:scale-[0.96]"
                disabled={!message.trim() || isSending}
                aria-label="Send message"
              >
                <Send aria-hidden="true" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Repin can make mistakes. Review important actions and answers.
          </p>
        </form>
      </div>
    </main>
  );
}
