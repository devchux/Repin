export function FormMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed text-destructive"
    >
      {message}
    </p>
  );
}
