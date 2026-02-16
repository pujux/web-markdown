# Express Integration

Use `@web-markdown/adapters-express` when you want middleware-level integration.

## Basic setup

```ts
import express from "express";

import { createExpressMarkdownMiddleware } from "@web-markdown/adapters-express";
import { createDefaultConverter } from "@web-markdown/converters";

const app = express();

app.use(
  createExpressMarkdownMiddleware({
    converter: createDefaultConverter({
      mode: "content",
      addFrontMatter: true,
    }),
    include: ["/**"],
    exclude: ["/not-markdown"],
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: true,
  }),
);
```

## Notes

- Middleware captures buffered responses and delegates transform rules to `transformFetchResponse`.
- `include` and `exclude` are path-pattern filters.
- If a route flushes/streams early, middleware falls back to passthrough behavior.
- `Vary: Accept` is still added on passthrough routes.

## Playground

- `/playground/express/server.mjs`
- `/playground/express/README.md`
