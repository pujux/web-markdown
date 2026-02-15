import { describe, expect, it, vi } from 'vitest';

import type { HtmlToMarkdownConverter } from '@web-markdown/core';

import { transformFetchResponse } from '../src/transform-fetch-response';

const markdownConverter: HtmlToMarkdownConverter = {
  name: 'test-converter',
  version: '1.2.3',
  convert: async (html) => `# Converted\n\n${html.replace(/<[^>]*>/g, '').trim()}`
};

function htmlResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...init?.headers
    },
    ...init
  });
}

describe('transformFetchResponse', () => {
  it('passes through when markdown is not explicitly acceptable', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/html,*/*' }
    });
    const res = htmlResponse('<html><body>Hello</body></html>');

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter
    });

    expect(out.headers.get('Vary')).toContain('Accept');
    expect(out.headers.get('Content-Type')).toContain('text/html');
    expect(await out.text()).toContain('Hello');
  });

  it('transforms html when markdown is accepted', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown, text/html;q=0.9' }
    });
    const res = htmlResponse('<html><body><h1>Hello</h1></body></html>');

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter,
      debugHeaders: true
    });

    expect(out.headers.get('Content-Type')).toContain('text/markdown');
    expect(out.headers.get('X-Markdown-Transformed')).toBe('1');
    expect(out.headers.get('X-Markdown-Converter')).toBe('1.2.3');
    expect(await out.text()).toContain('# Converted');
  });

  it('skips redirects', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = new Response(null, {
      status: 302,
      headers: { Location: 'https://example.com/next' }
    });

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter
    });

    expect(out.status).toBe(302);
    expect(out.headers.get('Location')).toBe('https://example.com/next');
  });

  it('skips non-html responses', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = new Response('{"ok":true}', {
      headers: { 'Content-Type': 'application/json' }
    });

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter
    });

    expect(out.headers.get('Content-Type')).toContain('application/json');
    expect(await out.text()).toBe('{"ok":true}');
  });

  it('sniffs html when content type is missing', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = new Response(
      new TextEncoder().encode('<!doctype html><html><body>hi</body></html>')
    );

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter
    });

    expect(out.headers.get('Content-Type')).toContain('text/markdown');
    expect(await out.text()).toContain('Converted');
  });

  it('handles maxHtmlBytes overflow with passthrough by default', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = htmlResponse('<html><body>abcdef</body></html>');

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter,
      maxHtmlBytes: 4
    });

    expect(out.status).toBe(200);
    expect(out.headers.get('Content-Type')).toContain('text/html');
  });

  it('can return 406 on maxHtmlBytes overflow', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = htmlResponse('<html><body>abcdef</body></html>');

    const out = await transformFetchResponse(req, res, {
      converter: markdownConverter,
      maxHtmlBytes: 4,
      oversizeBehavior: 'not-acceptable'
    });

    expect(out.status).toBe(406);
    expect(out.headers.get('Content-Type')).toContain('text/plain');
  });

  it('reports observations', async () => {
    const onObservation = vi.fn();
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = htmlResponse('<html><body>Hello</body></html>');

    await transformFetchResponse(req, res, {
      converter: markdownConverter,
      onObservation
    });

    expect(onObservation).toHaveBeenCalledTimes(1);
    expect(onObservation.mock.calls[0][0]).toMatchObject({
      transformed: true
    });
  });

  it('falls back when converter throws', async () => {
    const req = new Request('https://example.com', {
      headers: { Accept: 'text/markdown' }
    });
    const res = htmlResponse('<html><body>Hello</body></html>');

    const out = await transformFetchResponse(req, res, {
      converter: {
        convert: () => {
          throw new Error('boom');
        }
      }
    });

    expect(out.headers.get('Content-Type')).toContain('text/html');
    expect(await out.text()).toContain('Hello');
  });
});
