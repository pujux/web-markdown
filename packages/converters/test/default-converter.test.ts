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
});
