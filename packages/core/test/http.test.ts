import { describe, expect, it } from 'vitest';

import { isHtmlContentType, isLikelyHtmlDocument, isRedirectStatus } from '../src/http';

describe('http helpers', () => {
  it('detects html content types', () => {
    expect(isHtmlContentType('text/html; charset=utf-8')).toBe(true);
    expect(isHtmlContentType('application/xhtml+xml')).toBe(true);
    expect(isHtmlContentType('application/json')).toBe(false);
  });

  it('detects likely html bodies', () => {
    expect(isLikelyHtmlDocument('<!doctype html><html></html>')).toBe(true);
    expect(isLikelyHtmlDocument('  <main>hello</main>')).toBe(true);
    expect(isLikelyHtmlDocument('{"ok":true}')).toBe(false);
  });

  it('detects redirect status codes', () => {
    expect(isRedirectStatus(301)).toBe(true);
    expect(isRedirectStatus(307)).toBe(true);
    expect(isRedirectStatus(200)).toBe(false);
  });
});
