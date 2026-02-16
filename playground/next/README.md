# Next Playground

Run:

```bash
pnpm --filter @web-markdown/playground-next dev
```

Try (page URL, not API route):

```bash
curl -H 'Accept: text/html' http://localhost:3002/
curl -H 'Accept: text/markdown' http://localhost:3002/
curl -H 'Accept: text/markdown' http://localhost:3002/not-markdown
```

Expected:

- `/` transforms to markdown.
- `/not-markdown` stays HTML due to `proxy.ts` exclude config.

Integration model shown here:

- `proxy.ts` manually decides rewrite with `normalizeRoutingOptions`, `shouldRewriteRequestToMarkdown`, and `buildInternalRewriteUrl`.
- `app/api/web-markdown/route.ts` manually calls `handleInternalMarkdownRequest`.
