import { useEffect, useRef, useState } from "react";
import { CircleStop, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@repo/ui/button";
import { RichContent } from "@repo/ui/rich-content";
import { TypingIndicator } from "@repo/ui/typing-indicator";
import type {
  AiAssistantCapability,
  AssistantConversation,
} from "@repo/contracts/assistant";

import { getAssistantConversation } from "../assistant/assistant-run-client";
import { ChatComposer } from "./chat-composer";
import { useAssistantRun } from "../hooks/use-assistant-run";
import {
  getRunStatusLabel,
  type AssistantRunStatusCopy,
} from "../lib/assistant-run";

const capabilityCopy = {
  explain: {
    cancelled: "Explanation cancelled",
    completed: "Explanation complete",
    failed: "Explanation failed",
    preparing: "Preparing explanation",
    resultTitle: "Explanation",
    runningPage: "Explaining page",
    runningSelection: "Explaining selection",
  },
  summarize: {
    cancelled: "Summary cancelled",
    completed: "Summary complete",
    failed: "Summary failed",
    preparing: "Preparing summary",
    resultTitle: "Summary",
    runningPage: "Summarizing page",
    runningSelection: "Summarizing selection",
  },
  translate: {
    cancelled: "Translation cancelled",
    completed: "Translation complete",
    failed: "Translation failed",
    preparing: "Preparing translation",
    resultTitle: "Translation",
    runningPage: "Translating page",
    runningSelection: "Translating selection",
  },
  chat: {
    cancelled: "Response cancelled",
    completed: "Response complete",
    failed: "Response failed",
    preparing: "Preparing response",
    resultTitle: "Response",
    runningPage: "Reading page",
    runningSelection: "Reading selection",
  },
} as const satisfies Record<AiAssistantCapability, AssistantRunStatusCopy>;

const TARGET_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
  "Hindi",
] as const;

export const AssistantRun = ({
  capability,
  enabled,
  requestId,
  selectedText,
}: {
  capability: AiAssistantCapability;
  enabled: boolean;
  requestId: string;
  selectedText: string;
}) => {
  const [targetLanguage, setTargetLanguage] = useState("");
  const [submittedLanguage, setSubmittedLanguage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [conversation, setConversation] = useState<AssistantConversation>();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const usesSelection = selectedText.length > 0;
  const copy = capabilityCopy[capability];
  const ready =
    (capability !== "translate" || Boolean(submittedLanguage)) &&
    (capability !== "chat" || Boolean(submittedMessage));
  const { cancel, cancelling, error, retry, run, sendMessage, starting } =
    useAssistantRun(
      capability,
      enabled && ready,
      requestId,
      selectedText,
      submittedLanguage || undefined,
      submittedMessage || undefined,
    );
  const active =
    starting ||
    Boolean(
      run &&
      ["queued", "running", "awaiting_approval", "suspended"].includes(
        run.status,
      ),
    );
  const failure = error ?? run?.error;
  const retryable = !active && Boolean(failure || run?.status === "cancelled");

  useEffect(() => {
    if (capability !== "chat" || run?.status !== "completed") return;
    void getAssistantConversation(run.conversationId)
      .then((nextConversation) => {
        setConversation(nextConversation);
        setPendingMessage("");
      })
      .catch(() => undefined);
  }, [capability, run?.conversationId, run?.status]);

  useEffect(() => {
    if (capability !== "chat") return;
    const frame = requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      if (!container) return;
      container.scrollTo({
        behavior: "smooth",
        top: container.scrollHeight,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    active,
    capability,
    conversation?.messages.length,
    pendingMessage,
    submittedMessage,
  ]);

  if (!ready) {
    if (capability === "chat") {
      return (
        <section className="mt-auto border-t border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          <ChatComposer
            placeholder="Ask about this page or selection"
            onSend={setSubmittedMessage}
          />
        </section>
      );
    }

    return (
      <section className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <label
            className="text-sm font-medium text-neutral-800 dark:text-neutral-100"
            htmlFor="repin-target-language"
          >
            Translate to
          </label>
          <select
            className="mt-2 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary dark:border-neutral-800 dark:bg-neutral-900"
            id="repin-target-language"
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
          >
            <option value="">Choose a language</option>
            {TARGET_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="self-end"
          disabled={!targetLanguage}
          onClick={() => setSubmittedLanguage(targetLanguage)}
        >
          Translate
        </Button>
      </section>
    );
  }

  if (capability === "chat") {
    const messages = conversation?.messages ?? [];
    const showInitialMessage = !conversation && Boolean(submittedMessage);

    return (
      <section
        aria-live="polite"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          className="flex-1 space-y-3 overflow-y-auto p-4"
          ref={chatScrollRef}
        >
          {showInitialMessage && (
            <div className="ml-8 rounded-xl bg-primary p-3 text-sm leading-6 text-white">
              {submittedMessage}
            </div>
          )}
          {messages.map((conversationMessage) => (
            <div
              className={
                conversationMessage.role === "user"
                  ? "ml-8 rounded-xl bg-primary p-3 text-sm leading-6 text-white"
                  : "mr-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
              }
              key={conversationMessage.id}
            >
              {conversationMessage.role === "assistant" ? (
                <RichContent content={conversationMessage.content} />
              ) : (
                conversationMessage.content
              )}
            </div>
          ))}

          {!!pendingMessage && (
            <div className="ml-8 rounded-xl bg-primary p-3 text-sm leading-6 text-white">
              {pendingMessage}
            </div>
          )}

          {active && <TypingIndicator label="Repin is typing" />}

          {failure && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
              {failure}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          <ChatComposer
            disabled={active}
            placeholder="Ask for follow-up changes"
            onSend={(content) => {
              setPendingMessage(content);
              void sendMessage(content);
            }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4" aria-live="polite">
      {active ? (
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {getRunStatusLabel(run?.status, usesSelection, copy)}
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              You can close the sidebar. This run will remain available in
              Activity.
            </p>
          </div>
        </div>
      ) : null}

      {run?.result ? (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {copy.resultTitle}
          </h2>
          <RichContent className="mt-3" content={run.result} />
        </div>
      ) : null}

      {failure ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          {failure}
        </div>
      ) : null}

      {!active && !run?.result && !failure && run ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {run.status === "cancelled"
            ? copy.cancelled
            : run.status === "completed"
              ? copy.completed
              : copy.failed}
        </p>
      ) : null}

      {active || retryable ? (
        <div className="mt-auto flex justify-end gap-2 pt-2">
          {active && run ? (
            <Button
              disabled={cancelling}
              onClick={() => void cancel()}
              size="sm"
              variant="ghost"
            >
              {cancelling ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <CircleStop className="mr-2 size-4" />
              )}
              Cancel
            </Button>
          ) : null}
          {retryable ? (
            <Button onClick={retry} size="sm">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
