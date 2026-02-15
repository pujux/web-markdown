import type { HtmlToMarkdownConverter, MarkdownTransformContext } from '@web-markdown/core';
import { parseHTML } from 'linkedom';
import { NodeHtmlMarkdown } from 'node-html-markdown';

import { buildFrontMatter } from './frontmatter';
import type { ConversionMetadata, DefaultConverterOptions, UrlRewriteContext } from './types';
import { resolveUrl, shouldSkipRewrite } from './url';

const DEFAULT_FRONTMATTER_FIELDS: Required<Pick<DefaultConverterOptions, 'frontMatterFields'>>['frontMatterFields'] = [
  'title',
  'url',
  'lang',
  'description',
  'canonical'
];

const DEFAULT_CONTENT_MODE_STRIP = [
  'nav',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'template',
  '[role="navigation"]',
  '[aria-label*="cookie" i]',
  '[id*="cookie" i]',
  '[class*="cookie" i]'
];

const CONTENT_ROOT_SELECTORS = ['main', 'article', '[role="main"]', '#main', '#content', '.content'];

const DEFAULT_OPTIONS: Required<
  Pick<DefaultConverterOptions, 'mode' | 'addFrontMatter' | 'stripSelectors' | 'frontMatterFields'>
> = {
  mode: 'verbatim',
  addFrontMatter: false,
  stripSelectors: [],
  frontMatterFields: DEFAULT_FRONTMATTER_FIELDS
};

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function getText(selector: string, document: Document): string | undefined {
  const value = document.querySelector(selector)?.textContent?.trim();
  return value || undefined;
}

function getAttribute(selector: string, attribute: string, document: Document): string | undefined {
  const value = document.querySelector(selector)?.getAttribute(attribute)?.trim();
  return value || undefined;
}

function rewriteUrls(
  document: Document,
  requestUrl: string,
  responseUrl: string | undefined,
  baseUrl: string | undefined,
  canonicalUrl: string | undefined,
  rewriteLink: DefaultConverterOptions['rewriteLink'],
  rewriteImage: DefaultConverterOptions['rewriteImage']
): void {
  const fallbackBase = canonicalUrl ?? responseUrl ?? requestUrl;

  const buildRewriteContext = (kind: 'link' | 'image', elementTag: string): UrlRewriteContext => {
    const context: UrlRewriteContext = {
      kind,
      requestUrl,
      elementTag
    };

    if (responseUrl) {
      context.responseUrl = responseUrl;
    }

    if (baseUrl) {
      context.baseUrl = baseUrl;
    }

    if (canonicalUrl) {
      context.canonicalUrl = canonicalUrl;
    }

    return context;
  };

  for (const anchor of document.querySelectorAll('a[href]')) {
    const original = anchor.getAttribute('href');
    if (!original || shouldSkipRewrite(original)) {
      continue;
    }

    const absolute = resolveUrl(original, baseUrl ?? fallbackBase);
    const candidate = absolute ?? original;

    const rewritten = rewriteLink
      ? rewriteLink(candidate, buildRewriteContext('link', 'a'))
      : candidate;

    anchor.setAttribute('href', rewritten);
  }

  for (const image of document.querySelectorAll('img[src]')) {
    const original = image.getAttribute('src');
    if (!original || shouldSkipRewrite(original)) {
      continue;
    }

    const absolute = resolveUrl(original, baseUrl ?? fallbackBase);
    const candidate = absolute ?? original;

    const rewritten = rewriteImage
      ? rewriteImage(candidate, buildRewriteContext('image', 'img'))
      : candidate;

    image.setAttribute('src', rewritten);
  }
}

function pickContentRoot(document: Document): Element | null {
  for (const selector of CONTENT_ROOT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return document.body;
}

function gatherMetadata(
  document: Document,
  requestUrl: string,
  responseUrl?: string
): { metadata: ConversionMetadata; baseUrl?: string; canonicalUrl?: string } {
  const urlFallback = responseUrl ?? requestUrl;
  const baseHref = getAttribute('base[href]', 'href', document);
  const canonicalHref = getAttribute('link[rel~="canonical"][href]', 'href', document);

  const baseUrl = resolveUrl(baseHref, urlFallback);
  const canonicalUrl = resolveUrl(canonicalHref, baseUrl ?? urlFallback);

  const metadata: ConversionMetadata = {
    url: requestUrl
  };

  const title = getText('title', document);
  const description = getAttribute('meta[name="description"]', 'content', document);
  const lang = document.documentElement.getAttribute('lang')?.trim();

  if (title) {
    metadata.title = title;
  }

  if (description) {
    metadata.description = description;
  }

  if (lang) {
    metadata.lang = lang;
  }

  if (canonicalUrl) {
    metadata.canonical = canonicalUrl;
  }

  const result: { metadata: ConversionMetadata; baseUrl?: string; canonicalUrl?: string } = {
    metadata
  };

  if (baseUrl) {
    result.baseUrl = baseUrl;
  }

  if (canonicalUrl) {
    result.canonicalUrl = canonicalUrl;
  }

  return result;
}

function applyStripSelectors(document: Document, selectors: string[]): void {
  for (const selector of selectors) {
    for (const node of document.querySelectorAll(selector)) {
      node.remove();
    }
  }
}

function renderMarkdown(html: string, markdownOptions?: Record<string, unknown>): string {
  const converter = new NodeHtmlMarkdown({
    bulletMarker: '-',
    codeFence: '```',
    ...markdownOptions
  });

  return converter.translate(html);
}

function buildMarkdownHtml(document: Document, mode: DefaultConverterOptions['mode']): string {
  if (mode !== 'content') {
    return document.body?.innerHTML ?? document.documentElement.innerHTML;
  }

  const root = pickContentRoot(document);
  return root?.innerHTML ?? document.body?.innerHTML ?? document.documentElement.innerHTML;
}

export class DefaultHtmlToMarkdownConverter implements HtmlToMarkdownConverter {
  readonly name = '@web-markdown/converters';
  readonly version = '0.1.0';

  private readonly options: Required<
    Pick<DefaultConverterOptions, 'mode' | 'addFrontMatter' | 'stripSelectors' | 'frontMatterFields'>
  > &
    Omit<DefaultConverterOptions, 'mode' | 'addFrontMatter' | 'stripSelectors' | 'frontMatterFields'>;

  constructor(options: DefaultConverterOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      stripSelectors: options.stripSelectors ?? DEFAULT_OPTIONS.stripSelectors,
      frontMatterFields: options.frontMatterFields ?? DEFAULT_FRONTMATTER_FIELDS
    };
  }

  convert(html: string, context: MarkdownTransformContext): string {
    const { document } = parseHTML(html);

    const { metadata, baseUrl, canonicalUrl } = gatherMetadata(
      document,
      context.requestUrl,
      context.responseUrl
    );

    const selectors = [
      ...this.options.stripSelectors,
      ...(this.options.mode === 'content' ? DEFAULT_CONTENT_MODE_STRIP : [])
    ];

    applyStripSelectors(document, selectors);
    rewriteUrls(
      document,
      context.requestUrl,
      context.responseUrl,
      baseUrl,
      canonicalUrl,
      this.options.rewriteLink,
      this.options.rewriteImage
    );

    const markdownBody = renderMarkdown(buildMarkdownHtml(document, this.options.mode), this.options.markdownOptions);

    if (!this.options.addFrontMatter) {
      return normalizeMarkdown(markdownBody);
    }

    const frontMatter = buildFrontMatter(metadata, this.options.frontMatterFields);
    return normalizeMarkdown(`${frontMatter}${markdownBody}`);
  }
}

export function createDefaultConverter(options: DefaultConverterOptions = {}): HtmlToMarkdownConverter {
  return new DefaultHtmlToMarkdownConverter(options);
}
