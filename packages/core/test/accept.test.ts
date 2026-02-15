import { describe, expect, it } from 'vitest';

import { acceptsMarkdown } from '../src/accept';

describe('acceptsMarkdown', () => {
  it('accepts explicit markdown', () => {
    expect(acceptsMarkdown(new Headers({ Accept: 'text/markdown' }))).toBe(true);
  });

  it('rejects wildcard-only accept headers', () => {
    expect(acceptsMarkdown(new Headers({ Accept: '*/*' }))).toBe(false);
    expect(acceptsMarkdown(new Headers({ Accept: 'text/*;q=1' }))).toBe(false);
  });

  it('rejects explicit markdown with q=0', () => {
    expect(acceptsMarkdown(new Headers({ Accept: 'text/markdown;q=0' }))).toBe(false);
  });

  it('accepts explicit markdown with positive q', () => {
    expect(acceptsMarkdown(new Headers({ Accept: 'text/html, text/markdown;q=0.2' }))).toBe(true);
  });

  it('uses the highest q value for duplicates', () => {
    expect(
      acceptsMarkdown(new Headers({ Accept: 'text/markdown;q=0, text/markdown;q=0.6' }))
    ).toBe(true);
  });

  it('accepts header records', () => {
    expect(acceptsMarkdown({ accept: 'text/markdown' })).toBe(true);
    expect(acceptsMarkdown({ accept: ['text/html', 'text/markdown;q=0.4'] })).toBe(true);
  });
});
