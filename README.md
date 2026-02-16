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
- `packages/adapters/express` -> `@web-markdown/adapters-express`
- `packages/adapters/next` -> `@web-markdown/adapters-next`
- `playground/` -> Express + Next demos

## Milestone 1 APIs

### `@web-markdown/core`

```ts
import { acceptsMarkdown, mergeVary } from "@web-markdown/core";

acceptsMarkdown(new Headers({ Accept: "text/markdown;q=0.9" })); // true
mergeVary("Accept-Encoding", "Accept"); // "Accept-Encoding, Accept"
```

### `@web-markdown/converters`

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

Supported converter options:

- `mode: 'verbatim' | 'content'`
- `addFrontMatter: boolean`
- `stripSelectors: string[]`
- `contentMinTextLength: number` (content mode extraction threshold, default `140`)
- `rewriteLink(url, ctx)`
- `rewriteImage(url, ctx)`
- `frontMatterFields` (defaults: `title`, `url`, `lang`, `description`, `canonical`)

### `@web-markdown/transform-fetch`

```ts
import { transformFetchResponse } from "@web-markdown/transform-fetch";
import { createDefaultConverter } from "@web-markdown/converters";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

export async function handle(request: Request): Promise<Response> {
  const upstream = await fetch(request);

  return transformFetchResponse(request, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough", // or 'not-acceptable'
    debugHeaders: false,
    onObservation: (event) => {
      // event: transformed, reason, durationMs, htmlBytes, markdownBytes
      console.log(event);
    },
  });
}
```

## Express adapter (`@web-markdown/adapters-express`)

```ts
import express from "express";

import { createExpressMarkdownMiddleware } from "@web-markdown/adapters-express";
import { createDefaultConverter } from "@web-markdown/converters";

const app = express();

app.use(
  createExpressMarkdownMiddleware({
    converter: createDefaultConverter({
      mode: "content",
      addFrontMatter: true,
    }),
    include: ["/**"],
    exclude: ["/not-markdown"],
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: true,
  }),
);
```

Adapter notes:

- Middleware captures buffered responses and delegates negotiation/transform rules to `transformFetchResponse`.
- Optional `include` / `exclude` path filters allow route-level transform scoping.
- If a handler streams/flushed headers early, middleware falls back to normal pass-through behavior.

## Next integration (`@web-markdown/adapters-next`)

This package ships integration primitives, not auto-generated Next wiring.

What it provides:

- Routing helpers: `normalizeRoutingOptions`, `shouldRewriteRequestToMarkdown`, `buildInternalRewriteUrl`
- Endpoint rewrite helper: `shouldRewriteRequestToMarkdownEndpoint` (routes eligible page requests through internal endpoint so non-markdown responses still get `Vary: Accept`)
- Internal endpoint transformer: `handleInternalMarkdownRequest`
- Route wrapper for fetch-style handlers: `withNextMarkdownRouteHandler`

### App Router manual wiring

```ts
// proxy.ts (Next 16+) or middleware.ts
import { NextResponse } from "next/server";
import { buildInternalRewriteUrl, normalizeRoutingOptions, shouldRewriteRequestToMarkdownEndpoint } from "@web-markdown/adapters-next";

const routing = normalizeRoutingOptions({
  include: ["/docs/**"],
  exclude: ["/docs/private"],
});

export default function proxy(request: Request): Response {
  if (!shouldRewriteRequestToMarkdownEndpoint(request, routing)) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(buildInternalRewriteUrl(request.url, routing));
}
```

```ts
// app/api/web-markdown/route.ts
import { handleInternalMarkdownRequest } from "@web-markdown/adapters-next";
import { createDefaultConverter } from "@web-markdown/converters";

const options = {
  converter: createDefaultConverter({
    mode: "content",
    addFrontMatter: true,
  }),
  include: ["/docs/**"],
  exclude: ["/docs/private"],
  debugHeaders: true,
};

export async function GET(request: Request): Promise<Response> {
  return handleInternalMarkdownRequest(request, options);
}

export async function HEAD(request: Request): Promise<Response> {
  return handleInternalMarkdownRequest(request, options);
}
```

### Pages Router manual wiring

Use the same `proxy.ts`/`middleware.ts` pattern, and serve the internal endpoint from a page with `getServerSideProps` (not an API route):

```tsx
// pages/web-markdown.tsx
import type { GetServerSideProps, NextPage } from "next";
import { handleInternalMarkdownRequest } from "@web-markdown/adapters-next";
import { createDefaultConverter } from "@web-markdown/converters";

const MarkdownPage: NextPage = () => null;

const options = {
  converter: createDefaultConverter({ mode: "content", addFrontMatter: true }),
  include: ["/docs/**"],
  exclude: ["/docs/private"],
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const host = context.req.headers.host ?? "localhost:3000";
  const protocol = context.req.headers["x-forwarded-proto"] ?? "http";
  const requestUrl = new URL(context.resolvedUrl ?? context.req.url ?? "/", `${protocol}://${host}`);

  const request = new Request(requestUrl, {
    method: context.req.method ?? "GET",
    headers: context.req.headers as HeadersInit,
  });

  const response = await handleInternalMarkdownRequest(request, options);
  context.res.statusCode = response.status;

  for (const [name, value] of response.headers.entries()) {
    context.res.setHeader(name, value);
  }

  context.res.end(Buffer.from(await response.arrayBuffer()));
  return { props: {} };
};

export default MarkdownPage;
```

Next integration notes:

- Markdown negotiation stays explicit (`Accept: text/markdown` only).
- Default exclusions skip `/api`, `/_next`, static assets, and the internal endpoint path.
- Include/exclude controls are path-based and shared across proxy + endpoint code.
- `shouldRewriteRequestToMarkdownEndpoint` rewrites eligible page requests to the internal endpoint so HTML passthrough responses still include `Vary: Accept`.
- Internal endpoint access is intentionally internal-only; direct calls can return `404`.
- Internal endpoint fetches source HTML with a bypass header to avoid rewrite loops.

## Content mode behavior

- Removes common boilerplate selectors (navigation/footer/cookie and similar chrome).
- Selects primary content by semantic root first (`main`/`article`), then uses structural scoring fallback for non-semantic pages.
- Prunes likely boilerplate subtrees by link-density and UI-hint patterns (`related`, `sidebar`, `breadcrumbs`, etc).

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

## Front matter metadata behavior

- `canonical` is populated from `link[rel=canonical]`, then `og:url`, then `twitter:url`.
- `url` uses best available source in order: canonical URL, response URL, request URL.
- URL fragments are removed from metadata URLs and rewritten absolute links for stability.
- `title` and `description` fall back through standard metadata tags (`title`, `og:*`, `twitter:*`).

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
pnpm build
```

## Playground

- Express: `pnpm --filter @web-markdown/playground-express start`
- Next: `pnpm --filter @web-markdown/playground-next dev`

## Milestone status

- M1 complete: core negotiation, fetch transformer, default converter, semantics + snapshot tests.
- M2 complete: Express adapter and integration tests.
- M3 complete: Next integration primitives + manual playground wiring.
- M4 complete: content extraction hardening + canonicalization/front-matter refinements.
