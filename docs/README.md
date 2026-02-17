# Documentation Index

## Core docs

| File                                                       | Description                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| [Architecture](./architecture.md)                          | Layer boundaries and end-to-end transform flow.                    |
| [Quickstart](./quickstart.md)                              | Start with fetch-style usage and common setup patterns.            |
| [HTTP semantics and caching contract](./http-semantics.md) | Negotiation, caching, representation rules, and fallback behavior. |
| [Converter behavior and options](./converter.md)           | Default converter capabilities and options.                        |

## Integration docs

| File                                                                  | Description                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Express integration guide](./integrations/express.md)                | Express middleware integration.                                     |
| [Fastify integration guide](./integrations/fastify.md)                | Fastify `onSend` hook integration.                                  |
| [Koa integration guide](./integrations/koa.md)                        | Koa middleware integration.                                         |
| [Node http/https integration guide](./integrations/node-http.md)      | Node core `http`/`https` integration.                               |
| [Remix integration recipe](./integrations/remix.md)                   | Docs-first fetch-native integration pattern.                        |
| [Astro integration recipe](./integrations/astro.md)                   | Docs-first SSR/hybrid integration pattern.                          |
| [SvelteKit integration recipe](./integrations/sveltekit.md)           | Docs-first `handle` hook integration pattern.                       |
| [Hono integration recipe](./integrations/hono.md)                     | Docs-first route-level fetch integration pattern.                   |
| [Next integration guide (App + Pages)](./integrations/next.md)        | Next App Router + Pages Router manual wiring.                       |
| [Integration strategy and adapter roadmap](./integration-strategy.md) | Which frameworks should get adapter packages vs docs-only guidance. |

## Contributor docs

| File                                                 | Description                         |
| ---------------------------------------------------- | ----------------------------------- |
| [Adapter authoring contract](./adapter-authoring.md) | Contract for writing new adapters.  |
| `pnpm smoke:playgrounds`                             | Runtime playground validation flow. |
