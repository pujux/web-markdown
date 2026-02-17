import { describe, expect, it } from "vitest";

import { createDefaultConverter } from "@web-markdown/converters";

import { createKoaMarkdownMiddleware, type KoaLikeContext } from "../src";

type HeaderValue = string | string[];

function createContext(
  pathname: string,
  accept = "text/markdown",
): {
  ctx: KoaLikeContext;
  getHeader: (name: string) => HeaderValue | undefined;
} {
  const headers = new Map<string, HeaderValue>();
  const responseHeaders: Record<string, HeaderValue> = {};

  const ctx: KoaLikeContext = {
    method: "GET",
    headers: {
      accept,
      host: "example.com",
    },
    protocol: "https",
    host: "example.com",
    url: pathname,
    path: pathname,
    status: 200,
    body: undefined,
    response: {
      headers: responseHeaders,
    },
    set(name, value) {
      headers.set(name.toLowerCase(), value);
      responseHeaders[name.toLowerCase()] = value;
    },
    remove(name) {
      headers.delete(name.toLowerCase());
      delete responseHeaders[name.toLowerCase()];
    },
  };

  return {
    ctx,
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
  };
}

describe("createKoaMarkdownMiddleware", () => {
  it("transforms eligible html responses", async () => {
    const { ctx, getHeader } = createContext("/docs");

    const middleware = createKoaMarkdownMiddleware({
      converter: createDefaultConverter({ mode: "content", addFrontMatter: false }),
      debugHeaders: true,
    });

    await middleware(ctx, async () => {
      ctx.status = 200;
      ctx.set("content-type", "text/html; charset=utf-8");
      ctx.body = "<!doctype html><html><body><main><h1>Hello</h1></main></body></html>";
    });

    expect(Buffer.isBuffer(ctx.body)).toBe(true);
    expect((ctx.body as Buffer).toString()).toContain("# Hello");
    expect(String(getHeader("content-type"))).toContain("text/markdown");
    expect(getHeader("x-markdown-transformed")).toBe("1");
    expect(String(getHeader("vary"))).toContain("Accept");
  });

  it("passes through when markdown is not explicitly accepted", async () => {
    const { ctx, getHeader } = createContext("/docs", "text/html,*/*");

    const middleware = createKoaMarkdownMiddleware({
      converter: createDefaultConverter(),
      debugHeaders: true,
    });

    await middleware(ctx, async () => {
      ctx.status = 200;
      ctx.set("content-type", "text/html; charset=utf-8");
      ctx.body = "<html><body>hello</body></html>";
    });

    expect(String(getHeader("content-type"))).toContain("text/html");
    expect(getHeader("x-markdown-transformed")).toBe("0");
    expect(String(getHeader("vary"))).toContain("Accept");
  });

  it("respects include and exclude path rules", async () => {
    const { ctx, getHeader } = createContext("/docs/private");

    const middleware = createKoaMarkdownMiddleware({
      converter: createDefaultConverter(),
      include: ["/docs/**"],
      exclude: ["/docs/private"],
      debugHeaders: true,
    });

    await middleware(ctx, async () => {
      ctx.status = 200;
      ctx.set("content-type", "text/html; charset=utf-8");
      ctx.body = "<html><body>private</body></html>";
    });

    expect(String(getHeader("content-type"))).toContain("text/html");
    expect(getHeader("x-markdown-transformed")).toBe("0");
    expect(String(getHeader("vary"))).toContain("Accept");
  });
});
