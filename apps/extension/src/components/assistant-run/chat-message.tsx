import { RichContent } from "@repo/ui/rich-content";

type ChatMessageProps = {
  readonly content: string;
  readonly role: "assistant" | "user";
};

export const ChatMessage = ({ content, role }: ChatMessageProps) => (
  <div
    className={
      "max-w-[86%] w-fit whitespace-pre-wrap rounded-2xl " +
      (role === "user"
        ? "ml-auto rounded-br-[5px] bg-primary p-3 text-sm leading-6 text-white"
        : "mr-auto rounded-bl-[5px] border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900")
    }
  >
    {role === "assistant" ? <RichContent content={content} /> : content}
  </div>
);
