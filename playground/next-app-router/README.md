# Next App Router Playground

Run:

```bash
pnpm --filter @web-markdown/playground-next-app-router dev
```

Use page URLs (not the internal endpoint):

```bash
# 1) Standard markdown transform
curl -i -H 'Accept: text/markdown' http://localhost:3002/rich

# 2) SEO metadata fallback (OpenGraph + Twitter -> front matter)
curl -i -H 'Accept: text/markdown' http://localhost:3002/seo

# 3) q-value rejects markdown -> HTML passthrough with Vary
curl -i -H 'Accept: text/markdown;q=0, text/html;q=1' http://localhost:3002/rich

# 4) Excluded path stays HTML
curl -i -H 'Accept: text/markdown' http://localhost:3002/not-markdown

# 5) Hook demo (rewriteLink/rewriteImage)
curl -i -H 'Accept: text/markdown' http://localhost:3002/hooks

# 6) Non-HTML passthrough (route handler response)
curl -i -H 'Accept: text/markdown' http://localhost:3002/file

# 7) Redirect passthrough (3xx)
curl -i -H 'Accept: text/markdown' http://localhost:3002/jump

# 8) API routes are excluded from rewrite by default
curl -i -H 'Accept: text/markdown' http://localhost:3002/api/health

# 9) Internal endpoint is intentionally internal-only
curl -i -H 'Accept: text/markdown' 'http://localhost:3002/api/web-markdown?wmsource=%2Frich'
```

What to look for:

- `Vary: Accept` on transformed and passthrough page responses.
- `X-Markdown-Transformed: 1|0` and `X-Markdown-Converter` when transformed.
- Front matter and canonical metadata on `/rich` markdown output.
- `/seo` includes richer SEO tags (`og:image`, `article:author`, `twitter:card`) and still fills front matter fields (`title`, `description`, `canonical`).
- `/not-markdown` remains HTML because route options exclude it.
- `/api/web-markdown` direct calls return `404` by design.

Integration model shown here:

- `proxy.ts` manually rewrites eligible requests with `normalizeRoutingOptions`, `shouldRewriteRequestToMarkdownEndpoint`, and `buildInternalRewriteUrl`.
- `app/api/web-markdown/route.ts` manually calls `handleInternalMarkdownRequest` and configures converter + observability hooks.
