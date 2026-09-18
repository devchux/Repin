import type { PageObservation } from "./context";

export interface PageContext {
  readonly url: string;
  readonly title: string;
  readonly selectedText?: string;
  readonly pageContent?: string;
  readonly selection?: SelectionAnchor;
  readonly observation?: PageObservation;
  readonly observationId?: string;
}

/**
 * Portable information used to relocate selected text after a page reload.
 * Consumers must treat all values as untrusted because they originate from a webpage.
 */
export interface SelectionAnchor {
  readonly exact: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly startOffset?: number;
  readonly endOffset?: number;
}
