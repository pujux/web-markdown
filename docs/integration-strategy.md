# Integration Strategy

This document explains which ecosystems should get first-class adapter packages and which should be
covered by docs + core packages.

## Decision criteria

An adapter package is high-value when all are true:

- The framework request/response model is not natively fetch-like.
- Repeated bridge code is non-trivial or error-prone.
- One adapter unlocks many downstream frameworks or apps.
- Long-term maintenance cost stays reasonable.

Docs-only is preferred when:

- The framework already uses `Request`/`Response` directly.
- Integration is a small wrapper around `transformFetchResponse`.
- A dedicated package would mostly duplicate examples.

## Priority model

We prioritize with this order:

1. Adapter ROI:
   how much repeated bridge code we remove.
2. Ecosystem unlock:
   how many teams/framework variants one adapter helps.
3. Operational risk:
   how easy it is to get semantics wrong without a shared adapter.
4. Maintenance cost:
   long-term API churn and runtime complexity.

## Framework matrix

| Ecosystem                       | Recommendation                    | Reasoning                                                                                      |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Express                         | `adapter package` (shipped)       | Node response monkey-patching + buffering behavior needs reusable glue.                        |
| Next.js                         | `adapter primitives` (shipped)    | Rewrites/internal endpoint patterns are framework-specific and easy to get wrong.              |
| Fastify                         | `adapter package` (high priority) | Popular Node server; strong ROI from shared `reply` lifecycle bridging.                        |
| Koa                             | `adapter package` (high priority) | Common middleware model; bridge logic is reusable and not fetch-native by default.             |
| Node `http/https`               | `adapter package` (high priority) | Baseline primitive that can support custom servers/frameworks with minimal dependencies.       |
| Nuxt/Nitro (`h3`)               | `adapter package` (medium)        | Non-fetch event model; reusable bridge likely valuable but smaller target than Fastify/Koa.    |
| Hono                            | `docs-first`                      | Mostly fetch-native; core transformer usually enough with light examples.                      |
| Remix                           | `docs-first`                      | Returns fetch `Response`; package would add little over documented patterns.                   |
| Astro (SSR/hybrid)              | `docs-first`                      | Middleware/endpoint flows can use fetch transformer directly; recipe is usually sufficient.    |
| SvelteKit                       | `docs-first`                      | `handle` hooks are already close to fetch semantics.                                           |
| Cloudflare Workers / Bun / Deno | `docs-first`                      | Native fetch runtimes; no adapter layer needed.                                                |
| NestJS                          | `docs-first`                      | Should compose with Express/Fastify adapters rather than adding Nest-specific package surface. |

## Proposed adapter roadmap

1. Fastify adapter package.
2. Koa adapter package.
3. Node `http/https` baseline adapter.
4. Nuxt/Nitro (`h3`) adapter package.

Rationale:

- Fastify and Koa have high adapter ROI with broad Node ecosystem usage.
- Node `http/https` gives a universal fallback for custom frameworks.
- Nuxt/Nitro is valuable but has a smaller immediate overlap than Fastify/Koa.

## Docs roadmap (no package needed first)

1. Remix recipe page.
2. Astro SSR/hybrid recipe page.
3. SvelteKit recipe page.
4. Hono recipe page.

## Contribution guidance

- New adapter packages should follow [Adapter authoring](/docs/adapter-authoring.md).
- Before adding a package, justify it with the criteria above.
- If core packages already solve integration cleanly, prefer docs over a new package.
