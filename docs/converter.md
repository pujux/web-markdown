# Converter Guide

The default converter lives in `@web-markdown/converters`.

## Example

```ts
import { createDefaultConverter } from "@web-markdown/converters";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
  stripSelectors: [".promo"],
  rewriteLink: (url) => url,
  rewriteImage: (url) => url,
});
```

## Supported options

- `mode: "verbatim" | "content"`
- `addFrontMatter: boolean`
- `stripSelectors: string[]`
- `contentMinTextLength: number`
- `frontMatterFields: Array<"title" | "url" | "lang" | "description" | "canonical">`
- `rewriteLink(url, ctx)`
- `rewriteImage(url, ctx)`

## Content mode behavior

- Removes common boilerplate selectors (nav/footer/cookie-like chrome).
- Prefers semantic roots (`main`, `article`, role main).
- Falls back to structural scoring when semantic roots are weak.
- Prunes likely boilerplate subtrees via link density and UI hints.

## Front matter behavior

- `canonical` uses:
  1. `link[rel=canonical]`
  2. `og:url`
  3. `twitter:url`
- `url` uses best available source:
  canonical -> response URL -> request URL.
- URL fragments are stripped for stability.
- `title` and `description` use standard metadata fallback order.

## URL rewrite context

`rewriteLink` and `rewriteImage` receive context with:

- `kind`
- `requestUrl`
- optional `responseUrl`
- optional `baseUrl`
- optional `canonicalUrl`
- `elementTag`
