import type { Bookmark } from '../entities/bookmark.entity';
import { BookmarkSearchHit } from './types';

const SEARCH_FIELDS = [
  'title',
  'description',
  'url',
  'note',
  'saveReason',
  'selectedText',
  'excerpt',
  'content',
] as const;

export const bookmarkSearchVector = (alias: string): string =>
  `to_tsvector('english', ${SEARCH_FIELDS.map((field) => `coalesce(${alias}."${field}", '')`).join(" || ' ' || ")})`;

const passageUrl = (sourceUrl: string, text: string): string => {
  const url = new URL(sourceUrl);
  url.hash = '';
  const exact = text.replace(/\s+/g, ' ').trim().slice(0, 220);
  return `${url.href}#:~:text=${encodeURIComponent(exact)}`;
};

const PASSAGE_FIELDS = [
  'selectedText',
  'content',
  'excerpt',
  'note',
  'description',
  'saveReason',
  'title',
] as const;

export function toBookmarkSearchHit(
  bookmark: Bookmark,
  query: string,
): BookmarkSearchHit {
  const terms = query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  let passageField: (typeof PASSAGE_FIELDS)[number] = 'title';
  let passage = bookmark.title;

  for (const field of PASSAGE_FIELDS) {
    const value = bookmark[field]?.trim();
    if (!value) continue;
    if (terms.some((term) => value.toLocaleLowerCase().includes(term))) {
      passageField = field;
      passage = value;
      break;
    }
  }

  const lowerPassage = passage.toLocaleLowerCase();
  const matchAt =
    terms
      .map((term) => lowerPassage.indexOf(term))
      .find((index) => index >= 0) ?? 0;
  const start = Math.max(0, matchAt - 100);
  const excerpt = passage
    .slice(start, start + 500)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    bookmarkId: bookmark.id,
    title: bookmark.title,
    sourceUrl: bookmark.url,
    saveReason: bookmark.saveReason ?? null,
    passage: `${start ? '…' : ''}${excerpt}${start + 500 < passage.length ? '…' : ''}`,
    passageUrl: passageUrl(bookmark.url, excerpt),
    passageField,
  };
}
