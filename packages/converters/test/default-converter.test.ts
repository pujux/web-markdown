import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDefaultConverter } from '../src/default-converter';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('createDefaultConverter', () => {
  it('converts html to stable markdown with front matter and absolute URLs', async () => {
    const converter = createDefaultConverter({
      addFrontMatter: true,
      mode: 'content'
    });

    const markdown = await converter.convert(fixture('basic.html'), {
      requestUrl: 'https://example.com/guide'
    });

    expect(markdown).toMatchSnapshot();
  });

  it('supports content mode boilerplate stripping', async () => {
    const converter = createDefaultConverter({
      mode: 'content'
    });

    const markdown = await converter.convert(fixture('content-mode.html'), {
      requestUrl: 'https://example.com/content'
    });

    expect(markdown).toMatchSnapshot();
  });

  it('hardens content extraction for non-semantic pages', async () => {
    const converter = createDefaultConverter({
      mode: 'content'
    });

    const markdown = await converter.convert(fixture('content-hardening.html'), {
      requestUrl: 'https://example.com/blog/apis'
    });

    expect(markdown).toMatchSnapshot();
  });

  it('prefers canonical metadata and og fallbacks for front matter', async () => {
    const converter = createDefaultConverter({
      mode: 'content',
      addFrontMatter: true
    });

    const markdown = await converter.convert(fixture('canonical-metadata.html'), {
      requestUrl: 'https://request.example.com/source#frag',
      responseUrl: 'https://response.example.com/fallback#hash'
    });

    expect(markdown).toMatchSnapshot();
  });

  it('applies link and image rewrite hooks', async () => {
    const converter = createDefaultConverter({
      rewriteLink: (url) => `${url}?src=md`,
      rewriteImage: (url) => `${url}?img=1`
    });

    const markdown = await converter.convert(
      '<html><body><a href="/a">A</a><img src="/img.png" alt="I" /></body></html>',
      {
        requestUrl: 'https://example.com/page'
      }
    );

    expect(markdown).toContain('[A](https://example.com/a?src=md)');
    expect(markdown).toContain('![I](https://example.com/img.png?img=1)');
  });

  it('uses normalized response url when canonical metadata is absent', async () => {
    const converter = createDefaultConverter({
      mode: 'content',
      addFrontMatter: true
    });

    const markdown = await converter.convert('<html><body><main><p>Hello</p></main></body></html>', {
      requestUrl: 'https://request.example.com/a#ignore',
      responseUrl: 'https://response.example.com/b?q=1#ignore'
    });

    expect(markdown).toContain('url: https://response.example.com/b?q=1');
    expect(markdown).not.toContain('#ignore');
  });
});
