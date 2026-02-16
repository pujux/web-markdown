# web-markdown

Framework-agnostic HTML to Markdown content negotiation for web responses.

`web-markdown` lets your app keep serving normal HTML by default, and serve Markdown only when a
client explicitly asks for it with `Accept: text/markdown`.

No duplicate templates. No crawler workflow. No behavioral change for normal browsers.

## How it works

1. Receive request and inspect `Accept`.
2. Decide whether markdown is explicitly acceptable.
3. If eligible, capture HTML response body (bounded by size limits).
4. Convert HTML to Markdown with a pluggable converter.
5. Return response with preserved status/cache semantics and merged `Vary: Accept` header.

## Why this exists

- AI agents and tooling often consume Markdown better than raw HTML.
- Most production apps already render HTML and should keep doing that.
- Content negotiation is the right HTTP mechanism for representation changes.

A typical blog page payload is roughly `500KB` as HTML/CSS/JS and about `2KB` as Markdown (around `99.6%` smaller).
Exact savings vary by page, but this shows how much
representation overhead can be removed, allowing agents to work faster and hit limits less often.

## Project principles

- Explicit negotiation only (`Accept: text/markdown` with satisfiable `q`).
- HTML remains the default behavior.
- `Vary: Accept` is always merged to protect caches.
- Core logic is reusable; adapters stay thin.

## Non-goals

- Crawling/scraping websites.
- Maintaining parallel Markdown templates.
- Altering normal `text/html` behavior for regular browser traffic.

## Packages

| Package                          | Description                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `@web-markdown/core`             | Accept parsing, `Vary` merging, HTTP helpers, shared path matching utilities.         |
| `@web-markdown/transform-fetch`  | Fetch `Request/Response` transformation pipeline with gating + observability.         |
| `@web-markdown/converters`       | Default HTML to Markdown converter (content mode, front matter, URL rewriting hooks). |
| `@web-markdown/adapters-express` | Express middleware adapter.                                                           |
| `@web-markdown/adapters-next`    | Next integration primitives (manual wiring for App Router and Pages Router).          |

## Integrations

Shipped today:

- Express adapter package.
- Next integration primitives package.

Planned adapter-package candidates:

- Fastify
- Koa
- Node `http/https` baseline adapter

Frameworks where docs + core packages are usually enough:

- Remix
- Astro
- SvelteKit
- Hono
- Cloudflare Workers / Bun / Deno fetch runtimes

Decision criteria and framework-by-framework rationale:

- `/docs/integration-strategy.md`

## Documentation

- [Docs index](`/docs/README.md`)
- [Architecture overview](`/docs/architecture.md`)
- [HTTP semantics and caching contract](`/docs/http-semantics.md`)
- [Integration strategy and adapter roadmap](`/docs/integration-strategy.md`)
- [Adapter authoring contract](`/docs/adapter-authoring.md`)
- [Express integration guide](`/docs/integrations/express.md`)
- [Next integration guide (App + Pages)](`/docs/integrations/next.md`)
- [Converter behavior and options](`/docs/converter.md`)
- [Quickstart and common patterns](`/docs/quickstart.md`)

## Playgrounds

| Adapter           | Command                                                        |
| ----------------- | -------------------------------------------------------------- |
| Express           | `pnpm --filter @web-markdown/playground-express start`         |
| Next App Router   | `pnpm --filter @web-markdown/playground-next-app-router dev`   |
| Next Pages Router | `pnpm --filter @web-markdown/playground-next-pages-router dev` |

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
