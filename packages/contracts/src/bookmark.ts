export interface Bookmark {
  readonly id: string;
  readonly url: string;
  readonly canonicalUrl: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly siteName: string | null;
  readonly author: string | null;
  readonly publishedAt: string | null;
  readonly imageUrl: string | null;
  readonly faviconUrl: string | null;
  readonly excerpt: string | null;
  readonly content: string | null;
  readonly selectedText: string | null;
  readonly note: string | null;
  readonly saveReason: string | null;
  readonly tags: readonly string[];
  readonly capturedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateBookmarkRequest {
  readonly url: string;
  readonly canonicalUrl?: string;
  readonly title: string;
  readonly description?: string;
  readonly siteName?: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly imageUrl?: string;
  readonly faviconUrl?: string;
  readonly excerpt?: string;
  readonly content?: string;
  readonly selectedText?: string;
  readonly note?: string;
  readonly saveReason?: string;
  readonly tags?: readonly string[];
  readonly capturedAt?: string;
}

export interface CreateBookmarkResult {
  readonly bookmark: Bookmark;
  readonly created: boolean;
}
