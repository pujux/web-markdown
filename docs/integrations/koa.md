# Koa Integration

Use `@web-markdown/adapters-koa` as a standard Koa middleware.

```ts
import Koa from "koa";

import { createKoaMarkdownMiddleware } from "@web-markdown/adapters-koa";
import { createDefaultConverter } from "@web-markdown/converters";

const app = new Koa();

app.use(
  createKoaMarkdownMiddleware({
    converter: createDefaultConverter({
      mode: "content",
      addFrontMatter: true,
    }),
    include: ["/docs/**"],
    exclude: ["/docs/private"],
    debugHeaders: true,
  }),
);
```

Notes:

- Middleware transforms buffered body types (`string`, `Buffer`, `Uint8Array`).
- Stream/object response bodies are passed through unchanged.
- `Vary: Accept` is still merged on passthrough routes.
