"use client";

import { useState } from "react";

import { Button } from "./button";
import { ArrowUp } from "./icons";
import { RichTextEditor } from "./rich-text-editor";

export function ChatComposer({
  disabled = false,
  initialContent = "",
  onSend,
  placeholder,
}: {
  readonly disabled?: boolean;
  readonly initialContent?: string;
  readonly onSend: (content: string) => void;
  readonly placeholder: string;
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
      <div className="mt-1.5 flex items-center justify-end">
        <Button
          aria-label="Send message"
          className="size-9 rounded-full"
          disabled={disabled || !message.trim()}
          size="icon"
          title="Send"
          type="button"
          onClick={() => send()}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
