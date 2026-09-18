export const HIGHLIGHT_COLORS = [
  "yellow",
  "orange",
  "blue",
  "green",
  "pink",
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface SavedHighlight {
  readonly id: string;
  readonly url: string;
  readonly pageTitle: string;
  readonly quote: string;
  readonly prefix: string | null;
  readonly suffix: string | null;
  readonly note: string | null;
  readonly color: HighlightColor;
  readonly capturedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateHighlightRequest {
  readonly clientId: string;
  readonly url: string;
  readonly pageTitle: string;
  readonly quote: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly color: HighlightColor;
}

export interface HighlightsPage {
  readonly items: readonly SavedHighlight[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly pageCount: number;
}
