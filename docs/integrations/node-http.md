# Node http/https Integration

Use `@web-markdown/adapters-node-http` when you run a custom Node `http` or `https` server.

```ts
import { createServer } from "node:http";

import { createNodeHttpMarkdownHandler } from "@web-markdown/adapters-node-http";
import { createDefaultConverter } from "@web-markdown/converters";

const handler = createNodeHttpMarkdownHandler(
  async ({ request }) => {
    const html = "<!doctype html><html><body><main><h1>Hello</h1></main></body></html>";

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
  {
    converter: createDefaultConverter({
      mode: "content",
      addFrontMatter: true,
    }),
    debugHeaders: true,
  },
);

createServer((req, res) => {
  void handler(req, res);
}).listen(3000);
```

Notes:

- The adapter is fetch-first: your upstream handler returns a fetch `Response`.
- It preserves status and relevant headers while applying transform semantics.
- Non-HTML and non-eligible requests pass through with `Vary: Accept`.
