export const getMetaContent = (
  ...selectors: readonly string[]
): string | undefined => {
  for (const selector of selectors) {
    const value = document
      .querySelector<HTMLMetaElement>(selector)
      ?.content.trim();
    if (value) return value;
  }

  return undefined;
};

export const toAbsoluteHttpUrl = (
  value?: string | null,
): string | undefined => {
  if (!value) return undefined;

  try {
    const url = new URL(value, window.location.href);
    return /^https?:$/.test(url.protocol) ? url.href.slice(0, 4096) : undefined;
  } catch {
    return undefined;
  }
};

export const getPublishedAt = (): string | undefined => {
  const value = getMetaContent(
    'meta[property="article:published_time"]',
    'meta[name="date"]',
  );
  if (!value) return undefined;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
};
