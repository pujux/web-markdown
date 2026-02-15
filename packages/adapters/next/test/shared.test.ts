import { describe, expect, it } from 'vitest';

import {
  buildInternalRewriteUrl,
  normalizeRoutingOptions,
  resolveSourceUrl,
  shouldRewriteRequestToMarkdown,
  shouldServeMarkdownForPath
} from '../src/shared';

describe('next shared routing', () => {
  it('excludes non-page paths by default', () => {
    const options = normalizeRoutingOptions();

    expect(shouldServeMarkdownForPath('/api/hello', options)).toBe(false);
    expect(shouldServeMarkdownForPath('/_next/static/chunk.js', options)).toBe(false);
    expect(shouldServeMarkdownForPath('/assets/image.png', options)).toBe(false);
    expect(shouldServeMarkdownForPath('/docs/getting-started', options)).toBe(true);
  });

  it('supports include and exclude patterns', () => {
    const options = normalizeRoutingOptions({
      include: ['/docs/**'],
      exclude: ['/docs/private']
    });

    expect(shouldServeMarkdownForPath('/docs/intro', options)).toBe(true);
    expect(shouldServeMarkdownForPath('/docs/private', options)).toBe(false);
    expect(shouldServeMarkdownForPath('/blog/post', options)).toBe(false);
  });

  it('decides rewrite only for markdown GET/HEAD requests', () => {
    const options = normalizeRoutingOptions();

    const markdownGet = new Request('https://example.com/docs', {
      method: 'GET',
      headers: {
        Accept: 'text/markdown'
      }
    });

    const htmlGet = new Request('https://example.com/docs', {
      method: 'GET',
      headers: {
        Accept: 'text/html,*/*'
      }
    });

    const markdownPost = new Request('https://example.com/docs', {
      method: 'POST',
      headers: {
        Accept: 'text/markdown'
      }
    });

    expect(shouldRewriteRequestToMarkdown(markdownGet, options)).toBe(true);
    expect(shouldRewriteRequestToMarkdown(htmlGet, options)).toBe(false);
    expect(shouldRewriteRequestToMarkdown(markdownPost, options)).toBe(false);
  });

  it('builds and resolves internal rewrite urls', () => {
    const options = normalizeRoutingOptions({
      internalPath: '/__md'
    });

    const internal = buildInternalRewriteUrl('https://example.com/docs?a=1', options);
    expect(internal.toString()).toBe('https://example.com/__md?__wm_source=%2Fdocs%3Fa%3D1');

    const source = resolveSourceUrl(internal.toString(), options);
    expect(source?.toString()).toBe('https://example.com/docs?a=1');
  });

  it('skips rewrite for bypassed requests', () => {
    const options = normalizeRoutingOptions();

    const bypassed = new Request('https://example.com/docs', {
      headers: {
        Accept: 'text/markdown',
        'x-web-markdown-bypass': '1'
      }
    });

    expect(shouldRewriteRequestToMarkdown(bypassed, options)).toBe(false);
  });
});
