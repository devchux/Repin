import { useState } from "react";

import { Button } from "@repo/ui/button";
import { createBookmark } from "@/lib/client/bookmark-client";
import {
  getMetaContent,
  getPublishedAt,
  toAbsoluteHttpUrl,
} from "@/lib/page/page-metadata";

export const BookmarkPanel = ({
  selectedText,
}: {
  readonly selectedText: string;
}) => {
  const [saveReason, setSaveReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const url = toAbsoluteHttpUrl(window.location.href);
    if (!url) {
      setError("This page cannot be saved as a Repin bookmark");
      return;
    }
    if (selectedText.length > 50_000) {
      setError("Select a shorter passage to attach to this bookmark");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const canonicalUrl = toAbsoluteHttpUrl(
        document
          .querySelector<HTMLLinkElement>('link[rel="canonical"]')
          ?.getAttribute("href"),
      );
      const description = getMetaContent(
        'meta[name="description"]',
        'meta[property="og:description"]',
      );
      const result = await createBookmark({
        url,
        canonicalUrl,
        title: (document.title.trim() || window.location.hostname).slice(0, 500),
        description: description?.slice(0, 2_000),
        siteName: getMetaContent('meta[property="og:site_name"]')?.slice(0, 255),
        author: getMetaContent('meta[name="author"]')?.slice(0, 255),
        publishedAt: getPublishedAt(),
        imageUrl: toAbsoluteHttpUrl(
          getMetaContent('meta[property="og:image"]'),
        ),
        faviconUrl: toAbsoluteHttpUrl(
          document
            .querySelector<HTMLLinkElement>('link[rel~="icon"]')
            ?.getAttribute("href"),
        ),
        excerpt: selectedText.slice(0, 10_000) || description?.slice(0, 10_000),
        content: document.body.innerText.slice(0, 1_000_000),
        selectedText: selectedText || undefined,
        saveReason: saveReason.trim() || undefined,
        capturedAt: new Date().toISOString(),
      });
      setStatus(
        result.created
          ? "Saved to your Repin bookmarks"
          : "This page is already in your Repin bookmarks",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Bookmark could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-1 flex-col gap-3 p-4">
      <label className="text-xs font-medium" htmlFor="repin-bookmark-reason">
        Why are you saving this? <span className="font-normal text-neutral-500">Optional</span>
      </label>
      <textarea
        className="min-h-28 resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        id="repin-bookmark-reason"
        maxLength={2_000}
        onChange={(event) => {
          setSaveReason(event.target.value);
          setStatus(null);
        }}
        placeholder="Add context so Repin can find this later…"
        value={saveReason}
      />
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
      {status ? <p className="text-xs text-green-700" role="status">{status}</p> : null}
      <Button disabled={saving || Boolean(status)} onClick={() => void save()}>
        {saving ? "Saving…" : "Save Repin bookmark"}
      </Button>
    </section>
  );
};
