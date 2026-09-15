export interface Note {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly sourceUrl?: string | null;
  readonly selectedText?: string | null;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateNoteRequest {
  readonly title: string;
  readonly body: string;
  readonly sourceUrl?: string;
  readonly selectedText?: string;
  readonly tags?: readonly string[];
}

export interface UpdateNoteRequest {
  readonly title?: string;
  readonly body?: string;
  readonly tags?: readonly string[];
}

export interface NotesPage {
  readonly items: readonly Note[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly pageCount: number;
}
