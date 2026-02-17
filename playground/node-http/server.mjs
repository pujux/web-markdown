import { createServer } from "node:http";

import { createNodeHttpMarkdownHandler } from "@web-markdown/adapters-node-http";
import { createDefaultConverter } from "@web-markdown/converters";
import { mergeVary } from "@web-markdown/core";

import { getDemoRouteResponse } from "../shared/demo-content.mjs";

const port = Number(process.env.PORT || 3006);

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

function getHeaderValue(headers, name) {
  const lowerName = name.toLowerCase();
  const value = headers[lowerName] ?? headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function buildRequestUrl(req) {
  const protocol =
    req.socket && "encrypted" in req.socket && req.socket.encrypted ? "https" : "http";
  const host =
    getHeaderValue(req.headers, "x-forwarded-host") ||
    getHeaderValue(req.headers, "host") ||
    "localhost";
  const path = req.url || "/";
  return new URL(path, `${protocol}://${host}`).toString();
}

function requestHeadersToFetchHeaders(headers) {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const part of value) {
        out.append(name, part);
      }
      continue;
    }

    out.set(name, String(value));
  }

  return out;
}

function getPathname(req) {
  try {
    return new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    return "/";
  }
}

function routeToFetchResponse(route) {
  if (!route) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(route.body, {
    status: route.status,
    headers: route.headers,
  });
}

async function demoUpstream({ request }) {
  const pathname = new URL(request.url).pathname;
  return routeToFetchResponse(getDemoRouteResponse(pathname, "Node HTTP"));
}

async function sendFetchResponse(res, method, response, headers = response.headers) {
  res.statusCode = response.status;
  if (response.statusText) {
    res.statusMessage = response.statusText;
  }

  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      continue;
    }

    res.setHeader(name, value);
  }

  const getSetCookie = headers.getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers);
    if (values.length > 0) {
      res.setHeader("set-cookie", values);
    }
  }

  if (method === "HEAD") {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

async function passthroughExcludedRoute(req, res) {
  const method = (req.method || "GET").toUpperCase();
  const request = new Request(buildRequestUrl(req), {
    method,
    headers: requestHeadersToFetchHeaders(req.headers),
  });

  const upstreamResponse = await demoUpstream({ req, request });
  const headers = new Headers(upstreamResponse.headers);
  headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));
  headers.set("X-Markdown-Transformed", "0");
  headers.delete("X-Markdown-Converter");

  await sendFetchResponse(res, method, upstreamResponse, headers);
}

const defaultHandler = createNodeHttpMarkdownHandler(demoUpstream, {
  converter: defaultConverter,
  maxHtmlBytes: 3 * 1024 * 1024,
  oversizeBehavior: "passthrough",
  debugHeaders: true,
  onObservation: (event) => {
    console.log(`[web-markdown:default] ${JSON.stringify(event)}`);
  },
});

const strictHandler = createNodeHttpMarkdownHandler(demoUpstream, {
  converter: createDefaultConverter({
    mode: "verbatim",
    addFrontMatter: false,
  }),
  maxHtmlBytes: 1024,
  oversizeBehavior: "not-acceptable",
  debugHeaders: true,
  onObservation: (event) => {
    console.log(`[web-markdown:strict] ${JSON.stringify(event)}`);
  },
});

const server = createServer((req, res) => {
  const pathname = getPathname(req);

  if (pathname === "/not-markdown") {
    void passthroughExcludedRoute(req, res);
    return;
  }

  if (pathname.startsWith("/strict/")) {
    void strictHandler(req, res);
    return;
  }

  void defaultHandler(req, res);
});

server.listen(port, () => {
  console.log(`Node http playground listening on http://localhost:${port}`);
});
