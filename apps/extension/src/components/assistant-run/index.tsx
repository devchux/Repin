import { useEffect, useRef, useState } from "react";
import { CircleStop, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@repo/ui/button";
import { RichContent } from "@repo/ui/rich-content";
import { TypingIndicator } from "@repo/ui/typing-indicator";
import { WorkflowPanel } from "@repo/ui/workflow-panel";
import type {
  AiAssistantCapability,
  AssistantConversation,
} from "@repo/contracts/assistant";

import { getAssistantConversation } from "../../assistant/assistant-run-client";
import { useAssistantExecution } from "../../hooks/use-assistant-execution";
import { useWorkflowInstance } from "../../hooks/use-workflow-instance";
import { getRunStatusLabel, isAssistantRunActive } from "../../lib/assistant-run";
import { capabilityCopy } from "@/lib/constants";
import { ChatMessage } from "./chat-message";
import { FailureMessage } from "./failure-message";
import { RunProgress } from "./run-progress";
import { TranslationPrompt } from "./translation-prompt";
import { ChatComposer } from "../chat-composer";

interface AssistantRunProps {
  readonly capability: AiAssistantCapability;
  readonly enabled: boolean;
  readonly requestId: string;
  readonly selectedText: string;
}

export const AssistantRun = ({
  capability,
  enabled,
  requestId,
  selectedText,
}: AssistantRunProps) => {
  const [targetLanguage, setTargetLanguage] = useState("");
  const [submittedLanguage, setSubmittedLanguage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [conversation, setConversation] = useState<AssistantConversation>();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const copy = capabilityCopy[capability];
  const readyToRun =
    (capability !== "translate" || Boolean(submittedLanguage)) &&
    (capability !== "chat" || Boolean(submittedMessage));
  const execution = useAssistantExecution(
    capability,
    enabled && readyToRun,
    requestId,
    selectedText,
    submittedLanguage || undefined,
    submittedMessage || undefined,
  );
  const workflow = useWorkflowInstance(execution.workflowInstanceId);
  const active = isAssistantRunActive(execution.run, execution.starting);
  const failure = execution.error ?? execution.run?.error;
  const retryable =
    !active && Boolean(failure || execution.run?.status === "cancelled");

  useEffect(() => {
    if (capability !== "chat" || execution.run?.status !== "completed") return;
    void getAssistantConversation(execution.run.conversationId)
      .then((nextConversation) => {
        setConversation(nextConversation);
        setPendingMessage("");
      })
      .catch(() => undefined);
  }, [capability, execution.run?.conversationId, execution.run?.status]);

  useEffect(() => {
    if (capability !== "chat") return;
    const frame = requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      if (container)
        container.scrollTo({ behavior: "smooth", top: container.scrollHeight });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    active,
    capability,
    conversation?.messages.length,
    pendingMessage,
    submittedMessage,
  ]);

  if (!readyToRun) {
    return capability === "chat" ? (
      <section className="mt-auto border-t border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
        <ChatComposer
          placeholder="Ask about this page or selection"
          onSend={setSubmittedMessage}
        />
      </section>
    ) : (
      <TranslationPrompt
        targetLanguage={targetLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onSubmit={() => setSubmittedLanguage(targetLanguage)}
      />
    );
  }

  if (execution.workflowInstanceId) {
    if (workflow.instance) {
      return (
        <WorkflowPanel
          cancelling={workflow.cancelling}
          instance={workflow.instance}
          onCancel={() => void workflow.cancel()}
        />
      );
    }
    return (
      <section className="flex flex-1 items-center justify-center p-4">
        {workflow.error ? (
          <p className="text-sm text-red-700 dark:text-red-300">
            {workflow.error}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <LoaderCircle className="size-4 animate-spin" />
            Loading workflow
          </div>
        )}
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
            <ChatMessage content={submittedMessage} role="user" />
          )}
          {messages.map((message) => (
            <ChatMessage
              content={message.content}
              key={message.id}
              role={message.role}
            />
          ))}
          {pendingMessage && (
            <ChatMessage content={pendingMessage} role="user" />
          )}
          {active && <TypingIndicator label="Repin is typing" />}
          {failure && <FailureMessage compact message={failure} />}
        </div>
        <div className="border-t border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          <ChatComposer
            disabled={active}
            placeholder="Ask for follow-up changes"
            onSend={(content) => {
              setPendingMessage(content);
              void execution.sendMessage(content);
            }}
          />
        </div>
      </section>
    );
  }

  const fallbackMessage =
    execution.run?.status === "cancelled"
      ? copy.cancelled
      : execution.run?.status === "completed"
        ? copy.completed
        : copy.failed;
  return (
    <section aria-live="polite" className="flex flex-1 flex-col gap-4 p-4">
      {active && (
        <RunProgress
          statusLabel={getRunStatusLabel(
            execution.run?.status,
            selectedText.length > 0,
            copy,
          )}
        />
      )}
      {execution.run?.result && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {copy.resultTitle}
          </h2>
          <RichContent className="mt-3" content={execution.run.result} />
        </div>
      )}
      {failure && <FailureMessage message={failure} />}
      {!active && !execution.run?.result && !failure && execution.run && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {fallbackMessage}
        </p>
      )}
      {(active || retryable) && (
        <div className="mt-auto flex justify-end gap-2 pt-2">
          {active && execution.run && (
            <Button
              disabled={execution.cancelling}
              onClick={() => void execution.cancel()}
              size="sm"
              variant="ghost"
            >
              {execution.cancelling ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <CircleStop className="mr-2 size-4" />
              )}
              Cancel
            </Button>
          )}
          {retryable && (
            <Button onClick={execution.retry} size="sm">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
