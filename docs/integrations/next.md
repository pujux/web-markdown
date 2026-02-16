# Next Integration

`@web-markdown/adapters-next` provides integration primitives, not auto-generated wiring.

## What the package provides

- Routing helpers:
  `normalizeRoutingOptions`, `shouldRewriteRequestToMarkdownEndpoint`,
  `buildInternalRewriteUrl`
- Internal endpoint transformer:
  `handleInternalMarkdownRequest`
- Fetch-style route wrapper:
  `withNextMarkdownRouteHandler`

## App Router pattern

1. Use `proxy.ts` (or `middleware.ts`) to rewrite eligible requests to an internal endpoint.
2. Implement an internal route handler that calls `handleInternalMarkdownRequest`.
3. Keep internal endpoint access private (for example marker/header checks).

Reference:

- `/playground/next-app-router/proxy.ts`
- `/playground/next-app-router/app/api/web-markdown/route.ts`
- `/playground/next-app-router/README.md`

## Pages Router pattern

1. Use `proxy.ts` rewrite helper logic.
2. Implement an API route bridge (`pages/api/web-markdown.ts`) that:
   - validates internal-only access,
   - reconstructs the source URL from rewrite metadata,
   - bridges request/response headers correctly.

Reference:

- `/playground/next-pages-router/proxy.ts`
- `/playground/next-pages-router/pages/api/web-markdown.ts`
- `/playground/next-pages-router/web-markdown.config.ts`
- `/playground/next-pages-router/README.md`

## Important behavior

- Markdown negotiation remains explicit.
- Default exclusions skip `/_next`, `/api`, static assets, and internal endpoint path.
- Include/exclude path controls are shared across rewrite and endpoint handling.
