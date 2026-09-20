import { RichContent } from "./rich-content";

export function ChatMessage({
  content,
  pending = false,
  role,
}: {
  readonly content: string;
  readonly pending?: boolean;
  readonly role: "assistant" | "user";
}) {
  return (
    <article
      aria-label={role === "assistant" ? "Repin" : "You"}
      className={role === "user" ? "flex justify-end" : "flex justify-start"}
    >
      <div
        className={
          "min-w-0 whitespace-pre-wrap text-[15px] leading-7 " +
          (role === "user"
            ? "max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground sm:max-w-[76%]"
            : "w-full max-w-3xl py-1 text-foreground") +
          (pending ? " opacity-70" : "")
        }
      >
        {role === "assistant" ? <RichContent content={content} /> : content}
      </div>
    </article>
  );
}
