# Architecture Overview

`web-markdown` is designed as a small set of composable layers.

## Layers

- `@web-markdown/core`
  - Accept negotiation
  - `Vary` merging
  - HTTP helpers
  - shared path-pattern matching utilities
- `@web-markdown/transform-fetch`
  - Fetch `Request/Response` transform pipeline
  - gating rules
  - body-size guardrails
  - observability hooks
- `@web-markdown/converters`
  - pluggable HTML -> Markdown converter interface
  - default converter implementation
- framework adapters
  - thin bridge from framework request/response types to fetch types
  - no custom negotiation logic

## Data flow

1. Request enters adapter or fetch handler.
2. `transformFetchResponse` checks negotiation and response eligibility.
3. If eligible, HTML body is buffered with size limits.
4. Converter produces Markdown.
5. Response headers are normalized (`Content-Type`, `Vary`, representation headers).
6. Observation hook receives metrics/fallback reason.

## Design intent

- Keep transformation behavior centralized and testable.
- Keep adapters thin and replaceable.
- Make unsupported frameworks easy to integrate via shared contracts.

For adapter contribution requirements, see `/docs/adapter-authoring.md`.
