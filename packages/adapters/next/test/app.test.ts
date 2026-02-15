import { describe, expect, it, vi } from 'vitest';

import type { HtmlToMarkdownConverter } from '@web-markdown/core';

import { createAppMarkdownEndpoint } from '../src/app';

const converter: HtmlToMarkdownConverter = {
  name: 'next-app-test',
  version: '1.0.0',
  convert: async (html) => `# Markdown\n\n${html.replace(/<[^>]*>/g, '').trim()}`
};

describe('createAppMarkdownEndpoint', () => {
  it('fetches html source and returns markdown', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(String(input));
      expect(request.url).toBe('https://example.com/docs');
      expect(request.headers.get('accept')).toContain('text/html');
      expect(request.headers.get('x-web-markdown-bypass')).toBe('1');

      return new Response('<html><body><main><h1>Hello</h1></main></body></html>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ETag: '"source"',
          'Cache-Control': 'public, max-age=300'
        }
      });
    });

    const handler = createAppMarkdownEndpoint({
      converter,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      debugHeaders: true
    });

    const request = new Request('https://example.com/__web_markdown__?__wm_source=%2Fdocs', {
      headers: {
        Accept: 'text/markdown'
      }
    });

    const response = await handler(request);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('etag')).toBeNull();
    expect(response.headers.get('vary')).toContain('Accept');
    expect(response.headers.get('x-markdown-transformed')).toBe('1');
    expect(await response.text()).toContain('# Markdown');
  });

  it('rejects invalid or excluded source requests', async () => {
    const fetchImpl = vi.fn();

    const handler = createAppMarkdownEndpoint({
      converter,
      fetchImpl,
      exclude: ['/docs/private']
    });

    const missing = await handler(new Request('https://example.com/__web_markdown__', {
      headers: {
        Accept: 'text/markdown'
      }
    }));

    const excluded = await handler(
      new Request('https://example.com/__web_markdown__?__wm_source=%2Fdocs%2Fprivate', {
        headers: {
          Accept: 'text/markdown'
        }
      })
    );

    expect(missing.status).toBe(400);
    expect(excluded.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
