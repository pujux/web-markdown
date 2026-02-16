# HTTP Semantics

`web-markdown` is intentionally strict about HTTP behavior.

## Negotiation rules

- Transform only when `Accept` explicitly contains `text/markdown` with `q > 0`.
- Do not transform on wildcard-only headers like `*/*` or `text/*`.
- If markdown is not explicitly acceptable, return the original representation.

## Gating rules

- Skip transformation for redirects (`3xx`).
- Skip non-HTML responses.
- Treat `text/html` and `application/xhtml+xml` as HTML.
- If `Content-Type` is missing, sniff body for likely HTML markers before converting.

## Caching and headers

- Always merge `Vary: Accept` on transformed and passthrough responses.
- Preserve status code and non-representation headers (for example `Cache-Control`).
- On transformed markdown responses:
  - set `Content-Type: text/markdown; charset=utf-8`
  - remove `Content-Length`
  - remove `Content-Encoding`
  - remove `ETag` (representation changed)

## Size limits and overflow

- Default `maxHtmlBytes`: `3MB`.
- Overflow behavior:
  - `passthrough` (default): return original HTML.
  - `not-acceptable`: return `406`.

## Observability

`transformFetchResponse` supports `onObservation` with:

- `transformed`
- fallback `reason` (if not transformed)
- `durationMs`
- `htmlBytes`
- `markdownBytes`
- `status`

Fallback reasons include:

- `not-acceptable`
- `not-html`
- `too-large`
- `status`
- `streamed-unsupported`
- `no-body`
- `converter-error`
