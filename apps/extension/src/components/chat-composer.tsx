import { useState } from "react";
import { ArrowUp, Mic, Square, X } from "lucide-react";

import { Button } from "@repo/ui/button";
import { RichTextEditor } from "@repo/ui/rich-text-editor";

export const ChatComposer = ({
  disabled = false,
  onSend,
  placeholder,
}: {
  disabled?: boolean;
  onSend: (content: string) => void;
  placeholder: string;
}) => {
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const send = () => {
    const content = message.trim();
    if (!content || disabled) return;
    onSend(content);
    setMessage("");
    setEditorKey((value) => value + 1);
  };

  return recording ? (
    <div className="flex items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
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
        className="size-9 shrink-0 rounded-full"
        disabled={disabled}
        size="icon"
        title="Send"
        onClick={send}
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
        key={editorKey}
        minHeightClassName="min-h-12"
        placeholder={placeholder}
        showToolbar={false}
        onChange={({ text }) => setMessage(text)}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <Button
          aria-label="Start audio recording"
          className="size-9 rounded-full text-neutral-500 dark:text-neutral-400"
          size="icon"
          title="Record audio"
          variant="ghost"
          onClick={() => setRecording(true)}
        >
          <Mic aria-hidden="true" />
        </Button>
        <Button
          aria-label="Send message"
          className="size-9 rounded-full"
          disabled={disabled || !message.trim()}
          size="icon"
          title="Send"
          onClick={send}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
