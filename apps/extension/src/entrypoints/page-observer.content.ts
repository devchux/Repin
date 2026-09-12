const EVENT_NAME = "repin:page-observation";

const emit = (payload: Readonly<Record<string, unknown>>) => {
  document.documentElement?.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: JSON.stringify(payload) }),
  );
};

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  world: "MAIN",
  main() {
    for (const level of ["debug", "info", "warn", "error"] as const) {
      const original = console[level].bind(console);
      console[level] = (...values: unknown[]) => {
        emit({
          kind: "console",
          level: level === "warn" ? "warning" : level,
          message: values
            .map((value) => (typeof value === "string" ? value : String(value)))
            .join(" ")
            .slice(0, 4_000),
          source: location.href,
          timestamp: new Date().toISOString(),
        });
        original(...values);
      };
    }

    const wrapDialog = <T extends (...arguments_: never[]) => unknown>(
      type: "alert" | "confirm" | "prompt",
      original: T,
    ): T =>
      ((...arguments_: Parameters<T>) => {
        emit({
          kind: "dialog",
          dialog: {
            open: true,
            type,
            message: String(arguments_[0] ?? "").slice(0, 4_000),
          },
        });
        try {
          return original(...arguments_);
        } finally {
          emit({ kind: "dialog", dialog: { open: false } });
        }
      }) as T;

    window.alert = wrapDialog("alert", window.alert.bind(window));
    window.confirm = wrapDialog("confirm", window.confirm.bind(window));
    window.prompt = wrapDialog("prompt", window.prompt.bind(window));
  },
});
