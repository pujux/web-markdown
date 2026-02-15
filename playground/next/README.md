# Next Playground

Run:

```bash
pnpm --filter @web-markdown/playground-next dev
```

Try (page URL, not API route):

```bash
curl -H 'Accept: text/html' http://localhost:3002/docs
curl -H 'Accept: text/markdown' http://localhost:3002/docs
curl -H 'Accept: text/markdown' http://localhost:3002/docs/private
```

Expected:
- `/docs` transforms to markdown.
- `/docs/private` stays HTML due to `proxy.ts` exclude config.
