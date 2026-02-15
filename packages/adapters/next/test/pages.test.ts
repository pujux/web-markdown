import { describe, expect, it } from 'vitest';

import type { HtmlToMarkdownConverter } from '@web-markdown/core';

import { createPagesMarkdownEndpoint } from '../src/pages';

const converter: HtmlToMarkdownConverter = {
  name: 'next-pages-test',
  version: '1.0.0',
  convert: async (html) => `# Markdown\n\n${html.replace(/<[^>]*>/g, '').trim()}`
};

function createMockResponse() {
  const headers = new Map<string, string | string[]>();

  return {
    statusCode: 200,
    writableEnded: false,
    body: new Uint8Array(),
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    end(chunk?: Buffer | string) {
      this.writableEnded = true;
      this.body = chunk
        ? Buffer.isBuffer(chunk)
          ? new Uint8Array(chunk)
          : new TextEncoder().encode(chunk)
        : new Uint8Array();
    }
  };
}

describe('createPagesMarkdownEndpoint', () => {
  it('writes transformed markdown response in getServerSideProps', async () => {
    const fetchImpl = async () =>
      new Response('<html><body><main><h1>Hello Pages</h1></main></body></html>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });

    const endpoint = createPagesMarkdownEndpoint({
      converter,
      fetchImpl,
      debugHeaders: true
    });

    const res = createMockResponse();

    const result = await endpoint.getServerSideProps({
      req: {
        method: 'GET',
        headers: {
          host: 'example.com',
          accept: 'text/markdown'
        },
        url: '/__web_markdown__?__wm_source=%2Fdocs'
      },
      res,
      resolvedUrl: '/__web_markdown__?__wm_source=%2Fdocs'
    } as never);

    expect(result).toEqual({ props: {} });
    expect(res.statusCode).toBe(200);
    expect(String(res.getHeader('content-type'))).toContain('text/markdown');
    expect(String(res.getHeader('x-markdown-transformed'))).toBe('1');
    expect(Buffer.from(res.body).toString()).toContain('# Markdown');
  });
});
