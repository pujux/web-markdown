# Node http/https Playground

Run:

```bash
pnpm --filter @web-markdown/playground-node-http start
```

Use `-i` so headers are visible:

```bash
# 1) Standard transform (content mode + front matter)
curl -i -H 'Accept: text/markdown' http://localhost:3006/guide

# 2) SEO metadata fallback (OpenGraph + Twitter -> front matter)
curl -i -H 'Accept: text/markdown' http://localhost:3006/seo

# 3) Conversion quality sample (headings/lists/code/tables/images)
curl -i -H 'Accept: text/markdown' http://localhost:3006/table

# 4) q-value rejects markdown (HTML passthrough)
curl -i -H 'Accept: text/markdown;q=0, text/html;q=1' http://localhost:3006/guide

# 5) Excluded path stays HTML (manual route bypass wiring)
curl -i -H 'Accept: text/markdown' http://localhost:3006/not-markdown

# 6) Non-HTML passthrough (JSON)
curl -i -H 'Accept: text/markdown' http://localhost:3006/json

# 7) Redirect passthrough (3xx)
curl -i -H 'Accept: text/markdown' http://localhost:3006/redirect

# 8) Attachment passthrough
curl -i -H 'Accept: text/markdown' http://localhost:3006/download

# 9) Oversize with passthrough behavior
curl -i -H 'Accept: text/markdown' http://localhost:3006/oversize-passthrough

# 10) Oversize with strict not-acceptable behavior (406)
curl -i -H 'Accept: text/markdown' http://localhost:3006/strict/oversize-406

# 11) Strict route still transforms when small
curl -i -H 'Accept: text/markdown' http://localhost:3006/strict/small

# 12) rewriteLink/rewriteImage hook demo
curl -i -H 'Accept: text/markdown' http://localhost:3006/hooks
```

What to look for:

- `Vary: Accept` on transformed and passthrough responses.
- `X-Markdown-Transformed: 1|0` and `X-Markdown-Converter` when transformed.
- `/guide` shows front matter + canonical/base-aware absolute URLs.
- `/seo` includes richer SEO tags (`og:image`, `article:author`, `twitter:card`) and still fills front matter fields (`title`, `description`, `canonical`).
- `/table` demonstrates headings, code blocks, lists, tables, and image alt text.
- Console logs include `onObservation` payloads for timing/bytes/fallback reasons.
