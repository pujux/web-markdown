# Hono Integration (Docs-first)

Hono handlers return fetch `Response`, so `transformFetchResponse` composes directly.

```ts
import { Hono } from "hono";
import { createDefaultConverter } from "@web-markdown/converters";
import { transformFetchResponse } from "@web-markdown/transform-fetch";

const app = new Hono();

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

app.get("/docs/*", async (c) => {
  const upstream = await fetch("https://example.com/rendered-doc", {
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    },
  });

  return transformFetchResponse(c.req.raw, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
  });
});
```

Notes:

- Keep this route-scoped to document-like content.
- Non-HTML payloads automatically pass through unchanged.
