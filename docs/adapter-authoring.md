# Adapter Authoring Contract

This document defines the behavior expected from framework adapters that integrate with
`@web-markdown/transform-fetch`.

## Core contract

- Only transform when `Accept` explicitly includes `text/markdown` with `q > 0`.
- Preserve normal HTML behavior when markdown is not explicitly acceptable.
- Always merge `Vary: Accept` into transformed and pass-through responses.
- Preserve upstream status code and non-representation headers where possible.
- Skip conversion for redirects (`3xx`) and non-HTML responses.

## Recommended adapter shape

1. Convert framework request to `Request`.
2. Convert framework response to `Response` (or wrap handler response directly if already fetch-style).
3. Call `transformFetchResponse(request, response, options)`.
4. Bridge transformed `Response` back to framework response object.

Keep adapter code thin and avoid re-implementing negotiation or content-type gating rules.

## Header handling rules

- Preserve:
  - `Cache-Control`
  - `Last-Modified`
  - `Set-Cookie` (handle multiple values correctly)
- Always merge `Vary: Accept`.
- When payload representation changes to markdown, remove:
  - `Content-Length`
  - `Content-Encoding`
  - `ETag`

## Body handling rules

- Use buffered transform for MVP-style adapters.
- Respect `maxHtmlBytes` (default `3MB`) and honor `oversizeBehavior`.
- If streaming starts before buffering is possible, fall back to passthrough behavior.

## Observability expectations

Support forwarding `onObservation` output with:

- `transformed`
- `durationMs`
- `htmlBytes`
- `markdownBytes`
- `status`
- fallback `reason` when not transformed

Known fallback reasons:

- `not-acceptable`
- `not-html`
- `too-large`
- `status`
- `streamed-unsupported`
- `no-body`
- `converter-error`

## Security expectations for internal endpoint patterns

If your framework integration uses an internal rewrite endpoint:

- Disallow direct public access (for example marker header + `404` on direct calls).
- Add a bypass marker/header for upstream fetches to avoid rewrite loops.
- Keep source-path resolution strict (must be same-origin path starting with `/`).

## Minimum test matrix for new adapters

- Markdown accepted + HTML response -> transformed markdown.
- Markdown not accepted -> HTML passthrough + `Vary: Accept`.
- Non-HTML response -> passthrough.
- Redirect response -> passthrough.
- Oversize response with:
  - `passthrough`
  - `not-acceptable`
- Include/exclude path filtering behavior.
- Stream/flush path fallback (if framework exposes streaming writes).
