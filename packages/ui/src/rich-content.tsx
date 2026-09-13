"use client";

import DOMPurify from "dompurify";
import { marked } from "marked";
import { type ComponentProps, useEffect, useState } from "react";

import { cn } from "./lib/utils";

export type RichContentProps = ComponentProps<"div"> & {
  content: string;
};

/**
 * Renders untrusted assistant output as Markdown with sanitized inline HTML.
 * Plain text is valid Markdown and therefore needs no separate code path.
 */
export function RichContent({ className, content, ...props }: RichContentProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string>();

  useEffect(() => {
    const parsed = marked.parse(content, { async: false, gfm: true }) as string;
    const sanitized = DOMPurify.sanitize(parsed, {
      FORBID_ATTR: ["class", "id", "style"],
      FORBID_TAGS: [
        "audio",
        "button",
        "embed",
        "form",
        "iframe",
        "img",
        "input",
        "object",
        "option",
        "picture",
        "script",
        "select",
        "source",
        "style",
        "textarea",
        "video",
      ],
    });
    const template = document.createElement("template");
    template.innerHTML = sanitized;
    template.content.querySelectorAll("a").forEach((link) => {
      link.rel = "noopener noreferrer";
      link.target = "_blank";
    });
    setSanitizedHtml(template.innerHTML);
  }, [content]);

  return (
    <div
      className={cn(
        "break-words text-sm leading-7 text-neutral-700 dark:text-neutral-200",
        "[&_a]:font-medium [&_a]:text-[#D94712] [&_a]:underline [&_a]:decoration-[#D94712]/30 [&_a]:underline-offset-4 hover:[&_a]:decoration-[#D94712]",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#F15A24] [&_blockquote]:pl-4 [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-300",
        "[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] dark:[&_code]:bg-neutral-800",
        "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1:first-child]:mt-0",
        "[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-tight [&_h2:first-child]:mt-0",
        "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:leading-tight [&_h3:first-child]:mt-0",
        "[&_hr]:my-6 [&_hr]:border-neutral-200 dark:[&_hr]:border-neutral-800",
        "[&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6",
        "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-950 [&_pre]:p-4 [&_pre]:text-neutral-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
        "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 dark:[&_td]:border-neutral-800 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:font-semibold dark:[&_th]:border-neutral-800 dark:[&_th]:bg-neutral-900",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6",
        className,
      )}
      dangerouslySetInnerHTML={
        sanitizedHtml === undefined ? undefined : { __html: sanitizedHtml }
      }
      {...props}
    >
      {sanitizedHtml === undefined ? content : null}
    </div>
  );
}
