# Express Playground

Run:

```bash
pnpm --filter @web-markdown/playground-express start
```

Use `-i` so headers are visible:

```bash
# 1) Standard transform (content mode + front matter)
curl -i -H 'Accept: text/markdown' http://localhost:3001/guide

# 2) Conversion quality sample (headings/lists/code/tables/images)
curl -i -H 'Accept: text/markdown' http://localhost:3001/table

# 3) q-value rejects markdown (HTML passthrough)
curl -i -H 'Accept: text/markdown;q=0, text/html;q=1' http://localhost:3001/guide

# 4) Excluded path stays HTML
curl -i -H 'Accept: text/markdown' http://localhost:3001/not-markdown

# 5) Non-HTML passthrough (JSON)
curl -i -H 'Accept: text/markdown' http://localhost:3001/json

# 6) Redirect passthrough (3xx)
curl -i -H 'Accept: text/markdown' http://localhost:3001/redirect

# 7) Attachment passthrough
curl -i -H 'Accept: text/markdown' http://localhost:3001/download

# 8) Oversize with passthrough behavior
curl -i -H 'Accept: text/markdown' http://localhost:3001/oversize-passthrough

# 9) Oversize with strict not-acceptable behavior (406)
curl -i -H 'Accept: text/markdown' http://localhost:3001/strict/oversize-406

# 10) Strict route still transforms when small
curl -i -H 'Accept: text/markdown' http://localhost:3001/strict/small

# 11) rewriteLink/rewriteImage hook demo
curl -i -H 'Accept: text/markdown' http://localhost:3001/hooks
```

What to look for:

- `Vary: Accept` on transformed and passthrough responses.
- `X-Markdown-Transformed: 1|0` and `X-Markdown-Converter` when transformed.
- `/guide` shows front matter + canonical/base-aware absolute URLs.
- `/table` demonstrates headings, code blocks, lists, tables, and image alt text.
- Console logs include `onObservation` payloads for timing/bytes/fallback reasons.
