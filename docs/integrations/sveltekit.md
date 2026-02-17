# SvelteKit Integration (Docs-first)

SvelteKit `handle` hooks are already fetch-style, so a package adapter is usually unnecessary.

```ts
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import { createDefaultConverter } from "@web-markdown/converters";
import { transformFetchResponse } from "@web-markdown/transform-fetch";

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
});

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  return transformFetchResponse(event.request, response, {
    converter,
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: true,
  });
};
```

Notes:

- Apply include/exclude logic around `event.url.pathname` if you only want certain routes.
- Avoid transforming endpoints that are intentionally non-HTML payloads.
