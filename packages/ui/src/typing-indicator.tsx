export interface TypingIndicatorProps {
  readonly label?: string;
}

const TYPING_DOT_DELAYS = [0, 150, 300] as const;

export const TypingIndicator = ({
  label = "Assistant is typing",
}: TypingIndicatorProps) => (
  <div
    aria-label={label}
    className="mr-4 flex w-fit items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
    role="status"
  >
    {TYPING_DOT_DELAYS.map((delay) => (
      <span
        aria-hidden="true"
        className="size-1.5 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500"
        key={delay}
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);
