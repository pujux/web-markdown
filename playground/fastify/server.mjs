import Fastify from "fastify";

import { createFastifyMarkdownOnSendHook } from "@web-markdown/adapters-fastify";
import { createDefaultConverter } from "@web-markdown/converters";

import { DEMO_ROUTE_PATHS, getDemoRouteResponse } from "../shared/demo-content.mjs";

const app = Fastify();
const port = Number(process.env.PORT || 3004);

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

const defaultMarkdownHook = createFastifyMarkdownOnSendHook({
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

const strictMarkdownHook = createFastifyMarkdownOnSendHook({
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

app.addHook("onSend", async (request, reply, payload) => {
  const pathname = request.url.split("?")[0] || "/";

  if (pathname.startsWith("/strict/")) {
    return strictMarkdownHook(request, reply, payload);
  }

  return defaultMarkdownHook(request, reply, payload);
});

function sendRouteResponse(reply, response) {
  reply.code(response.status);

  for (const [name, value] of Object.entries(response.headers)) {
    reply.header(name, value);
  }

  return response.body;
}

for (const pathname of DEMO_ROUTE_PATHS) {
  app.get(pathname, async (_request, reply) => {
    const response = getDemoRouteResponse(pathname, "Fastify");
    if (!response) {
      return sendRouteResponse(reply, {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
        body: "Route fixture missing",
      });
    }

    return sendRouteResponse(reply, response);
  });
}

app.setNotFoundHandler((_request, reply) => {
  reply.code(404);
  reply.header("content-type", "text/plain; charset=utf-8");
  reply.send("Not Found");
});

app
  .listen({
    port,
    host: "0.0.0.0",
  })
  .then(() => {
    console.log(`Fastify playground listening on http://localhost:${port}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
