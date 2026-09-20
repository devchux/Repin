"use client";

import { useState } from "react";

import { Button } from "./button";
import { ArrowUp, LoaderCircle, X } from "./icons";
import { RichTextEditor } from "./rich-text-editor";

export function ChatComposer({
  disabled = false,
  initialContent = "",
  isSending = false,
  onCancel,
  onSend,
  placeholder,
  statusLabel,
}: {
  readonly disabled?: boolean;
  readonly initialContent?: string;
  readonly isSending?: boolean;
  readonly onCancel?: () => void;
  readonly onSend: (content: string) => void;
  readonly placeholder: string;
  readonly statusLabel?: string;
}) {
  const [message, setMessage] = useState(initialContent);
  const [editorKey, setEditorKey] = useState(0);

  const send = (value = message) => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setMessage("");
    setEditorKey((current) => current + 1);
  };

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-sm transition-colors focus-within:border-[#F15A24]/50 dark:border-neutral-800 dark:bg-neutral-900">
      <RichTextEditor
        className="border-0 bg-transparent ring-offset-transparent focus-within:ring-0 focus-within:ring-offset-0 dark:bg-transparent"
        content={editorKey === 0 ? initialContent : ""}
        contentClassName="px-3 py-2 text-sm leading-5"
        disabled={disabled}
        editorClassName="text-sm"
        key={editorKey}
        minHeightClassName="min-h-12"
        placeholder={placeholder}
        showToolbar={false}
        onChange={({ text }) => setMessage(text)}
        onSubmit={send}
      />
      <div className="mt-1.5 flex min-h-9 items-center justify-between gap-3 pl-3">
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
          {statusLabel ?? "Enter to send, Shift + Enter for a new line"}
        </p>
        {isSending && onCancel ? (
          <Button
            aria-label="Stop response"
            className="size-9 shrink-0 rounded-full"
            size="icon"
            title="Stop response"
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            aria-label="Send message"
            className="size-9 shrink-0 rounded-full"
            disabled={disabled || !message.trim()}
            size="icon"
            title="Send"
            type="button"
            onClick={() => send()}
          >
            {isSending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
