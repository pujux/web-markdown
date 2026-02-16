# Quickstart

## 1) Install packages

| Type                 | Command                                                            |
| -------------------- | ------------------------------------------------------------------ |
| Fetch-style runtimes | `pnpm add @web-markdown/transform-fetch @web-markdown/converters`  |
| Express              | `pnpm add @web-markdown/adapters-express @web-markdown/converters` |
| Next                 | `pnpm add @web-markdown/adapters-next @web-markdown/converters`    |

## 2) Fetch runtime baseline

```ts
import { createDefaultConverter } from "@web-markdown/converters";
import { transformFetchResponse } from "@web-markdown/transform-fetch";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

export async function handle(request: Request): Promise<Response> {
  const upstream = await fetch(request);

  return transformFetchResponse(request, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: false,
  });
}
```

## 3) Verify behavior

Transform:

```bash
curl -i -H 'Accept: text/markdown' http://localhost:3000/docs
```

Passthrough:

```bash
curl -i -H 'Accept: text/html,*/*' http://localhost:3000/docs
```

What to check:

- `Vary: Accept` exists on both responses.
- `Content-Type` becomes `text/markdown` only when markdown is explicitly acceptable.
- Status code and cache headers remain intact.

## 4) Next steps

- [Semantics and edge cases](/docs/http-semantics.md)
- [Converter options and metadata](/docs/converter.md)
- Framework integration guides: [Express](/docs/integrations/express.md), [Next.js](/docs/integrations/next.md)
