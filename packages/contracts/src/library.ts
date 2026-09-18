export const LIBRARY_ITEM_TYPES = [
  "note",
  "highlight",
  "bookmark",
  "page",
] as const;

export type LibraryItemType = (typeof LIBRARY_ITEM_TYPES)[number];
