import Koa from "koa";

import { createKoaMarkdownMiddleware } from "@web-markdown/adapters-koa";
import { createDefaultConverter } from "@web-markdown/converters";

import { getDemoRouteResponse } from "../shared/demo-content.mjs";

const app = new Koa();
const port = Number(process.env.PORT || 3005);

const defaultConverter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
  rewriteLink: (url, ctx) => {
    const pathname = new URL(ctx.requestUrl).pathname;
    if (!pathname.startsWith("/hooks")) {
      return url;
    }

    const rewritten = new URL(url);
    rewritten.searchParams.set("rewritten", "1");
    return rewritten.toString();
  },
  rewriteImage: (url, ctx) => {
    const pathname = new URL(ctx.requestUrl).pathname;
    if (!pathname.startsWith("/hooks")) {
      return url;
    }

    const rewritten = new URL(url);
    rewritten.searchParams.set("img", "1");
    return rewritten.toString();
  },
});

const defaultMarkdownMiddleware = createKoaMarkdownMiddleware({
  converter: defaultConverter,
  include: ["/**"],
  exclude: ["/not-markdown", "/strict/**"],
  maxHtmlBytes: 3 * 1024 * 1024,
  oversizeBehavior: "passthrough",
  debugHeaders: true,
  onObservation: (event) => {
    console.log(`[web-markdown:default] ${JSON.stringify(event)}`);
  },
});

const strictMarkdownMiddleware = createKoaMarkdownMiddleware({
  converter: createDefaultConverter({
    mode: "verbatim",
    addFrontMatter: false,
  }),
  include: ["/strict/**"],
  maxHtmlBytes: 1024,
  oversizeBehavior: "not-acceptable",
  debugHeaders: true,
  onObservation: (event) => {
    console.log(`[web-markdown:strict] ${JSON.stringify(event)}`);
  },
});

app.use(async (ctx, next) => {
  if (ctx.path.startsWith("/strict/")) {
    await strictMarkdownMiddleware(ctx, next);
    return;
  }

  await defaultMarkdownMiddleware(ctx, next);
});

app.use(async (ctx, next) => {
  if (ctx.method !== "GET") {
    await next();
    return;
  }

  const response = getDemoRouteResponse(ctx.path, "Koa");
  if (!response) {
    await next();
    return;
  }

  ctx.status = response.status;

  for (const [name, value] of Object.entries(response.headers)) {
    ctx.set(name, value);
  }

  ctx.body = response.body;
});

app.use((ctx) => {
  ctx.status = 404;
  ctx.set("content-type", "text/plain; charset=utf-8");
  ctx.body = "Not Found";
});

app.listen(port, () => {
  console.log(`Koa playground listening on http://localhost:${port}`);
});
