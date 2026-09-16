export interface BookmarkSearchHit {
  readonly bookmarkId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly saveReason: string | null;
  readonly passage: string;
  readonly passageUrl: string;
  readonly passageField:
    | 'selectedText'
    | 'excerpt'
    | 'content'
    | 'note'
    | 'description'
    | 'saveReason'
    | 'title';
}
