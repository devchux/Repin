"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "./lib/utils";

interface RichTextEditorProps
  extends Omit<ComponentProps<"div">, "onChange" | "onSubmit"> {
  content?: string;
  contentClassName?: string;
  editorClassName?: string;
  minHeightClassName?: string;
  placeholder?: string;
  showToolbar?: boolean;
  disabled?: boolean;
  onChange?: (value: { html: string; text: string }) => void;
  onSubmit?: (text: string) => void;
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
  disabled = false,
  onChange,
  onSubmit,
  ...props
}: RichTextEditorProps) {
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none whitespace-pre-wrap outline-none [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-neutral-500 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          minHeightClassName,
          editorClassName,
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
          return false;
        }
        event.preventDefault();
        onSubmitRef.current?.(
          view.state.doc.textBetween(0, view.state.doc.content.size, "\n"),
        );
        return true;
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

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

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
        className={cn(
          "px-4 py-3 text-base leading-6 max-h-40 overflow-auto",
          contentClassName,
        )}
        editor={editor}
      />
    </div>
  );
}
