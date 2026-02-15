import { describe, expect, it } from 'vitest';

import { createNextMarkdownMiddleware } from '../src/middleware';

describe('createNextMarkdownMiddleware', () => {
  it('rewrites markdown page requests to internal endpoint', () => {
    const middleware = createNextMarkdownMiddleware({
      internalPath: '/__md'
    });

    const response = middleware(
      new Request('https://example.com/docs/getting-started?page=1', {
        headers: {
          Accept: 'text/markdown, text/html;q=0.9'
        }
      })
    );

    expect(response).toBeInstanceOf(Response);
    expect(response?.headers.get('x-middleware-rewrite')).toBe(
      'https://example.com/__md?__wm_source=%2Fdocs%2Fgetting-started%3Fpage%3D1'
    );
  });

  it('does not rewrite non-markdown or excluded requests', () => {
    const middleware = createNextMarkdownMiddleware();

    const htmlResponse = middleware(
      new Request('https://example.com/docs', {
        headers: {
          Accept: 'text/html,*/*'
        }
      })
    );

    const apiResponse = middleware(
      new Request('https://example.com/api/users', {
        headers: {
          Accept: 'text/markdown'
        }
      })
    );

    expect(htmlResponse).toBeUndefined();
    expect(apiResponse).toBeUndefined();
  });
});
