import { describe, expect, it, vi } from 'vitest';

import type { HtmlToMarkdownConverter } from '@web-markdown/core';

import { handleInternalMarkdownRequest } from '../src/internal';

const converter: HtmlToMarkdownConverter = {
  name: 'next-internal-test',
  version: '1.0.0',
  convert: async (html) => `# Markdown\n\n${html.replace(/<[^>]*>/g, '').trim()}`
};

describe('handleInternalMarkdownRequest', () => {
  it('fetches the source URL and transforms HTML to markdown', async () => {
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

    const response = await handleInternalMarkdownRequest(
      new Request('https://example.com/__web_markdown__?__wm_source=%2Fdocs', {
        headers: {
          Accept: 'text/markdown'
        }
      }),
      {
        converter,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        debugHeaders: true
      }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('etag')).toBeNull();
    expect(response.headers.get('vary')).toContain('Accept');
    expect(response.headers.get('x-markdown-transformed')).toBe('1');
    expect(await response.text()).toContain('# Markdown');
  });

  it('rejects requests without an internal source path', async () => {
    const response = await handleInternalMarkdownRequest(
      new Request('https://example.com/__web_markdown__', {
        headers: {
          Accept: 'text/markdown'
        }
      }),
      {
        converter
      }
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Missing or invalid markdown source URL');
  });

  it('rejects excluded source paths', async () => {
    const fetchImpl = vi.fn();

    const response = await handleInternalMarkdownRequest(
      new Request('https://example.com/__web_markdown__?__wm_source=%2Fdocs%2Fprivate', {
        headers: {
          Accept: 'text/markdown'
        }
      }),
      {
        converter,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        include: ['/docs/**'],
        exclude: ['/docs/private']
      }
    );

    expect(response.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
