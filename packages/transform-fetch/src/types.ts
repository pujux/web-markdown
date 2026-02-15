import type { HtmlToMarkdownConverter } from '@web-markdown/core';

export type OversizeBehavior = 'passthrough' | 'not-acceptable';

export type TransformFallbackReason =
  | 'not-acceptable'
  | 'not-html'
  | 'too-large'
  | 'status'
  | 'streamed-unsupported'
  | 'no-body'
  | 'converter-error';

export interface TransformObservation {
  transformed: boolean;
  reason?: TransformFallbackReason;
  durationMs: number;
  htmlBytes: number;
  markdownBytes: number;
  status: number;
}

export interface TransformFetchResponseOptions {
  converter: HtmlToMarkdownConverter;
  maxHtmlBytes?: number;
  oversizeBehavior?: OversizeBehavior;
  debugHeaders?: boolean;
  onObservation?: (observation: TransformObservation) => void;
}
