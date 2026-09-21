export const BOOKMARK_ENRICHMENT_QUEUE = 'bookmark-enrichment';
export const ENRICH_BOOKMARK_JOB = 'enrich-bookmark';

export const bookmarkEnrichmentJobId = (bookmarkId: string) =>
  `bookmark-${bookmarkId}`;
