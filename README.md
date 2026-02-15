# web-markdown

Framework-agnostic HTML to Markdown content negotiation for web responses.

## What it does
- Keeps normal HTML behavior for regular requests.
- Transforms only when `Accept` explicitly includes `text/markdown` with `q > 0`.
- Adds/merges `Vary: Accept` on transformed and pass-through responses.
- Converts only HTML responses (`text/html`, `application/xhtml+xml`, or sniffed HTML when content type is absent).
- Preserves response status and cache headers.

## Workspace layout
- `packages/core` -> `@web-markdown/core`
- `packages/transform-fetch` -> `@web-markdown/transform-fetch`
- `packages/converters` -> `@web-markdown/converters`
- `packages/adapters/express` -> scaffold for M2
- `packages/adapters/next` -> scaffold for M3
- `playground/` -> scaffold for M2/M3 demos

## Milestone 1 APIs

### `@web-markdown/core`
```ts
import { acceptsMarkdown, mergeVary } from '@web-markdown/core';

acceptsMarkdown(new Headers({ Accept: 'text/markdown;q=0.9' })); // true
mergeVary('Accept-Encoding', 'Accept'); // "Accept-Encoding, Accept"
```

### `@web-markdown/converters`
```ts
import { createDefaultConverter } from '@web-markdown/converters';

const converter = createDefaultConverter({
  mode: 'content',
  addFrontMatter: true,
  stripSelectors: ['.promo'],
  rewriteLink: (url) => url,
  rewriteImage: (url) => url
});
```

Supported converter options:
- `mode: 'verbatim' | 'content'`
- `addFrontMatter: boolean`
- `stripSelectors: string[]`
- `rewriteLink(url, ctx)`
- `rewriteImage(url, ctx)`
- `frontMatterFields` (defaults: `title`, `url`, `lang`, `description`, `canonical`)

### `@web-markdown/transform-fetch`
```ts
import { transformFetchResponse } from '@web-markdown/transform-fetch';
import { createDefaultConverter } from '@web-markdown/converters';

const converter = createDefaultConverter({
  mode: 'content',
  addFrontMatter: true
});

export async function handle(request: Request): Promise<Response> {
  const upstream = await fetch(request);

  return transformFetchResponse(request, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: 'passthrough', // or 'not-acceptable'
    debugHeaders: false,
    onObservation: (event) => {
      // event: transformed, reason, durationMs, htmlBytes, markdownBytes
      console.log(event);
    }
  });
}
```

## HTTP semantics and caching notes
- No explicit `text/markdown` in `Accept`: pass through original response.
- Redirects (`3xx`): never transformed.
- Non-HTML content types: never transformed.
- Missing `Content-Type`: body is sniffed for likely HTML markers before conversion.
- Body limit default: `3MB` via `maxHtmlBytes`.
- Overflow behavior:
  - `passthrough` (default): return original HTML.
  - `not-acceptable`: return `406`.
- `Vary: Accept` is always merged into outgoing headers to prevent cache poisoning.
- On transformed responses:
  - `Content-Type` is set to `text/markdown; charset=utf-8`.
  - `Content-Length`, `Content-Encoding`, and `ETag` are removed because the payload changes.

## Observability
`transformFetchResponse` exposes `onObservation` with:
- `durationMs`
- `htmlBytes`
- `markdownBytes`
- `transformed`
- fallback `reason` (for example: `not-acceptable`, `not-html`, `too-large`, `streamed-unsupported`)

Optional debug headers:
- `X-Markdown-Transformed: 1|0`
- `X-Markdown-Converter: <version>`

## Development
```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
```

## Milestone status
- M1 complete: core negotiation, fetch transformer, default converter, semantics + snapshot tests.
- M2 planned: Express adapter and integration tests.
- M3 planned: Next adapter + playground demos.
- M4 planned: content extraction hardening + canonicalization refinements.
