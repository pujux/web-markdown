# Next Pages Router Playground

Run:

```bash
pnpm --filter @web-markdown/playground-next-pages-router dev
```

Use page URLs (not the internal API endpoint):

```bash
# 1) Standard markdown transform
curl -i -H 'Accept: text/markdown' http://localhost:3003/rich

# 2) q-value rejects markdown -> HTML passthrough with Vary
curl -i -H 'Accept: text/markdown;q=0, text/html;q=1' http://localhost:3003/rich

# 3) Excluded path stays HTML
curl -i -H 'Accept: text/markdown' http://localhost:3003/not-markdown

# 4) Hook demo (rewriteLink/rewriteImage)
curl -i -H 'Accept: text/markdown' http://localhost:3003/hooks

# 5) Non-HTML passthrough (pages route writing CSV)
curl -i -H 'Accept: text/markdown' http://localhost:3003/file

# 6) Redirect passthrough (3xx)
curl -i -H 'Accept: text/markdown' http://localhost:3003/jump

# 7) API routes are excluded from rewrite by default
curl -i -H 'Accept: text/markdown' http://localhost:3003/api/health

# 8) Internal endpoint is intentionally internal-only
curl -i -H 'Accept: text/markdown' 'http://localhost:3003/api/web-markdown?wmsource=%2Frich'
```

What to look for:

- `Vary: Accept` on transformed and passthrough page responses.
- `X-Markdown-Transformed: 1|0` and `X-Markdown-Converter` when transformed.
- Front matter and canonical metadata on `/rich` markdown output.
- `/not-markdown` remains HTML because route options exclude it.
- `/api/web-markdown` direct calls return `404` unless rewritten internally.

Integration model shown here:

- `proxy.ts` manually rewrites eligible requests with `normalizeRoutingOptions`, `shouldRewriteRequestToMarkdownEndpoint`, and `buildInternalRewriteUrl`.
- `pages/api/web-markdown.ts` bridges Pages Router request/response to `handleInternalMarkdownRequest`.
