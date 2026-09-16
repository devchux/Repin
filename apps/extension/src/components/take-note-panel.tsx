import { useState } from "react";
import { Button } from "@repo/ui/button";
import { createNote } from "@/lib/client/note-client";

export const TakeNotePanel = ({
  page,
  selectedText,
}: {
  readonly page: { readonly title: string; readonly url: string };
  readonly selectedText: string;
}) => {
  const [title, setTitle] = useState(
    document.title || page.title || "Page note",
  );
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (selectedText.length > 50_000) {
      setError("Select a shorter passage to attach to this note");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createNote({
        title: title.trim(),
        body: body.trim(),
        sourceUrl: window.location.href,
        selectedText: selectedText || undefined,
      });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Note could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-1 flex-col gap-3 p-4">
      <label className="text-xs font-medium" htmlFor="repin-note-title">
        Title
      </label>
      <input
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        id="repin-note-title"
        maxLength={500}
        onChange={(event) => {
          setTitle(event.target.value);
          setSaved(false);
        }}
        value={title}
      />
      <label className="text-xs font-medium" htmlFor="repin-note-body">
        Note
      </label>
      <textarea
        className="min-h-40 flex-1 resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        id="repin-note-body"
        maxLength={100_000}
        onChange={(event) => {
          setBody(event.target.value);
          setSaved(false);
        }}
        placeholder="Write a note about this page…"
        value={body}
      />
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-xs text-green-700" role="status">
          Saved to your notes
        </p>
      ) : null}
      <Button
        disabled={!title.trim() || !body.trim() || saving || saved}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save note"}
      </Button>
    </section>
  );
};
