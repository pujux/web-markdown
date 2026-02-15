# ExecPlan: Framework-agnostic HTML->Markdown Negotiation

## Module Boundaries
- `@web-markdown/core`
  - Owns Accept negotiation, `Vary` handling, response/content-type helpers, shared interfaces.
  - Must not import framework/runtime adapters.
- `@web-markdown/converters`
  - Owns pluggable converter contract implementation and default HTML->Markdown conversion.
  - Exposes configurable hooks (`mode`, front matter, selector stripping, URL rewrite hooks).
- `@web-markdown/transform-fetch`
  - Owns buffered response transformation for Fetch API runtimes.
  - Performs request/response gating, max-size enforcement, and observability hooks.
- `@web-markdown/adapters/express`
  - Thin middleware wrapper around core + converter + transform flow.
- `@web-markdown/adapters/next`
  - Next integration primitives (routing decisions + internal endpoint transform) with manual app wiring.
- `playground/`
  - Minimal runnable demos for Express and Next.

## Public APIs
- `@web-markdown/core`
  - `acceptsMarkdown(headers: Headers | Record<string, string | string[] | undefined>): boolean`
  - `mergeVary(existing: string | null | undefined, value: string): string`
  - `isRedirectStatus(status: number): boolean`
  - `isHtmlContentType(contentType: string | null | undefined): boolean`
  - `isLikelyHtmlDocument(body: string): boolean`
  - `interface HtmlToMarkdownConverter { convert(html: string, ctx: MarkdownTransformContext): Promise<string> | string }`
- `@web-markdown/converters`
  - `createDefaultConverter(options?: DefaultConverterOptions): HtmlToMarkdownConverter`
  - `interface DefaultConverterOptions { mode, addFrontMatter, stripSelectors, rewriteLink, rewriteImage }`
- `@web-markdown/transform-fetch`
  - `transformFetchResponse(req: Request, res: Response, opts: TransformFetchResponseOptions): Promise<Response>`
  - Observability hook: timing, html bytes, markdown bytes, and fallback reasons.

## Data Flow Sequence
1. Request arrives with `Accept` header.
2. `transformFetchResponse` checks negotiation via `acceptsMarkdown`.
3. Always merge/add `Vary: Accept` on outgoing response.
4. Gate by status and content type (skip redirects and non-HTML).
5. Buffer HTML body (bounded by `maxHtmlBytes`).
6. If eligible, call converter to produce Markdown.
7. Replace response body and content type (`text/markdown`), preserve status + cache headers.
8. Emit observability metadata and optional debug headers.

## Failure Modes + Mitigations
- Client does not explicitly accept Markdown.
  - Mitigation: pass through original response, still set `Vary: Accept`.
- Response is redirect/non-HTML/no body.
  - Mitigation: pass through unchanged body, maintain status and headers.
- Body exceeds `maxHtmlBytes`.
  - Mitigation: configurable strategy: pass through HTML (default) or return `406`.
- Missing/ambiguous `Content-Type`.
  - Mitigation: sniff buffered body for likely HTML before conversion.
- Stream already consumed/locked.
  - Mitigation: skip transform with `streamed-unsupported` reason.
- Converter failure.
  - Mitigation: fail open by default (pass through HTML) and report fallback reason.

## Milestones
- M1: core + fetch transform + default converter + tests.
- M2: express adapter + tests.
- M3: next integration primitives + manual playground wiring.
- M4: content-only mode hardening + canonical URL rewrite improvements + front matter tuning.

## Rollback Strategy
- Keep conversion behind explicit Accept negotiation.
- Adapters must call shared transformation utilities and avoid custom branching.
- If regressions occur, disable transform path by adapter config while preserving normal HTML responses.
- Preserve backward compatibility via semver and additive option defaults.

## Keeping Connectors Thin
- Adapters should only translate framework request/response objects into Fetch-like primitives.
- No parsing/rewriting logic inside adapters.
- Shared tests assert identical behavior between fetch path and adapter wrappers.
