"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ComponentProps } from "react";

import { cn } from "./lib/utils";

interface RichTextEditorProps
  extends Omit<ComponentProps<"div">, "onChange"> {
  content?: string;
  contentClassName?: string;
  editorClassName?: string;
  minHeightClassName?: string;
  placeholder?: string;
  showToolbar?: boolean;
  onChange?: (value: { html: string; text: string }) => void;
}

const toolbarButtons = [
  {
    label: "Bold",
    value: "B",
    isActive: (editor: Editor) => editor.isActive("bold"),
    onClick: (editor: Editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    value: "I",
    isActive: (editor: Editor) => editor.isActive("italic"),
    onClick: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: "Bullet list",
    value: "•",
    isActive: (editor: Editor) => editor.isActive("bulletList"),
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Ordered list",
    value: "1.",
    isActive: (editor: Editor) => editor.isActive("orderedList"),
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleOrderedList().run(),
  },
] as const;

export function RichTextEditor({
  className,
  content = "",
  contentClassName,
  editorClassName,
  minHeightClassName = "min-h-24",
  placeholder = "Write something...",
  showToolbar = true,
  onChange,
  ...props
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none outline-none [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-neutral-500 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          minHeightClassName,
          editorClassName,
        ),
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.({
        html: editor.getHTML(),
        text: editor.getText(),
      });
    },
  });

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white text-neutral-950 ring-offset-white transition focus-within:ring-2 focus-within:ring-[#F15A24] focus-within:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:ring-offset-neutral-950",
        className,
      )}
      {...props}
    >
      {showToolbar && editor ? (
        <div className="flex items-center gap-1 border-b border-neutral-200 p-1.5 dark:border-neutral-800">
          {toolbarButtons.map((button) => (
            <button
              aria-label={button.label}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium text-neutral-600 transition hover:bg-[#F15A24] hover:text-white dark:text-neutral-300",
                button.isActive(editor) && "bg-[#F15A24] text-white",
              )}
              key={button.label}
              title={button.label}
              type="button"
              onClick={() => button.onClick(editor)}
            >
              {button.value}
            </button>
          ))}
        </div>
      ) : null}
      <EditorContent
        className={cn("px-4 py-3 text-base leading-6 max-h-40 overflow-auto", contentClassName)}
        editor={editor}
      />
    </div>
  );
}
