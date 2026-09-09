type FailureMessageProps = {
  readonly compact?: boolean;
  readonly message: string;
};

export const FailureMessage = ({
  compact = false,
  message,
}: FailureMessageProps) => (
  <div
    className={`rounded-xl border border-red-200 bg-red-50 ${compact ? "p-3" : "p-4"} text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300`}
  >
    {message}
  </div>
);
