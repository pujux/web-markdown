# Fastify Integration

Use `@web-markdown/adapters-fastify` as an `onSend` hook.

```ts
import Fastify from "fastify";

import { createFastifyMarkdownOnSendHook } from "@web-markdown/adapters-fastify";
import { createDefaultConverter } from "@web-markdown/converters";

const app = Fastify();

app.addHook(
  "onSend",
  createFastifyMarkdownOnSendHook({
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

- Hook operates on buffered payloads (`string`, `Buffer`, `Uint8Array`).
- Stream/object payloads are passed through unchanged.
- `Vary: Accept` is still merged on passthrough routes.
