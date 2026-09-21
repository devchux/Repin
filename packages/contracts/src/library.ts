import type { PaginatedResult } from "./pagination";

export const LIBRARY_ITEM_TYPES = [
  "note",
  "highlight",
  "bookmark",
  "page",
] as const;

export type LibraryItemType = (typeof LIBRARY_ITEM_TYPES)[number];

export interface LibraryItem {
  readonly id: string;
  readonly type: LibraryItemType;
  readonly title?: string;
  readonly content?: string;
  readonly url?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type LibraryItemsPage = PaginatedResult<LibraryItem>;
