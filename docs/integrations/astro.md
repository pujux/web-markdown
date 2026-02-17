# Astro Integration (SSR/Hybrid, Docs-first)

Astro SSR/hybrid flows can use the fetch transformer directly.

```ts
// src/pages/docs/[slug].ts
import type { APIRoute } from "astro";
import { createDefaultConverter } from "@web-markdown/converters";
import { transformFetchResponse } from "@web-markdown/transform-fetch";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

export const GET: APIRoute = async ({ request, params, url }) => {
  const upstream = await fetch(new URL(`/rendered/${params.slug}`, url).toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    },
  });

  return transformFetchResponse(request, upstream, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
  });
};
```

Notes:

- This pattern targets runtime routes (SSR/hybrid), not static prerender output.
- Preserve regular HTML responses for non-markdown `Accept` headers.
