# Remix Integration (Docs-first)

Remix is fetch-native, so a dedicated adapter package is usually unnecessary.

Use `transformFetchResponse` in your loader/action response path.

```ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { createDefaultConverter } from "@web-markdown/converters";
import { transformFetchResponse } from "@web-markdown/transform-fetch";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const upstream = await fetch("https://example.com/docs");

  return transformFetchResponse(request, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: true,
  });
}
```

Notes:

- Keep markdown negotiation explicit (`Accept: text/markdown` only).
- Let HTML remain default for regular browser traffic.
- Ensure caching layers respect `Vary: Accept`.
