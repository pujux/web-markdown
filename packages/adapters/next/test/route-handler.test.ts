import { describe, expect, it, vi } from "vitest";

import type { HtmlToMarkdownConverter } from "@web-markdown/core";

import { transformNextResponse, withNextMarkdownRouteHandler } from "../src";

const converter: HtmlToMarkdownConverter = {
  name: "next-test",
  version: "9.9.9",
  convert: async (html) => `# Markdown\n\n${html.replace(/<[^>]*>/g, "").trim()}`,
};

describe("withNextMarkdownRouteHandler", () => {
  it("transforms html for markdown accept requests", async () => {
    const handler = withNextMarkdownRouteHandler(
      async () =>
        new Response("<html><body><main><h1>Hello</h1></main></body></html>", {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            Vary: "Accept-Encoding",
            ETag: '"tag"',
          },
        }),
      {
        converter,
        debugHeaders: true,
      },
    );

    const out = await handler(
      new Request("https://example.com", { headers: { Accept: "text/markdown" } }),
      {
        params: {},
      },
    );

    expect(out.status).toBe(200);
    expect(out.headers.get("content-type")).toContain("text/markdown");
    expect(out.headers.get("vary")).toContain("Accept-Encoding");
    expect(out.headers.get("vary")).toContain("Accept");
    expect(out.headers.get("etag")).toBeNull();
    expect(out.headers.get("x-markdown-transformed")).toBe("1");
    expect(out.headers.get("x-markdown-converter")).toBe("9.9.9");
    expect(await out.text()).toContain("# Markdown");
  });

  it("passes through when markdown is not explicitly accepted", async () => {
    const handler = withNextMarkdownRouteHandler(
      async () =>
        new Response("<html><body>Hello</body></html>", {
          headers: { "Content-Type": "text/html" },
        }),
      {
        converter,
        debugHeaders: true,
      },
    );

    const out = await handler(
      new Request("https://example.com", { headers: { Accept: "text/html,*/*" } }),
      {
        params: {},
      },
    );

    expect(out.headers.get("content-type")).toContain("text/html");
    expect(out.headers.get("x-markdown-transformed")).toBe("0");
    expect(await out.text()).toContain("Hello");
  });

  it("passes through non-html responses", async () => {
    const handler = withNextMarkdownRouteHandler(
      async () => new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } }),
      {
        converter,
        debugHeaders: true,
      },
    );

    const out = await handler(
      new Request("https://example.com", { headers: { Accept: "text/markdown" } }),
      {
        params: {},
      },
    );

    expect(out.headers.get("content-type")).toContain("application/json");
    expect(out.headers.get("x-markdown-transformed")).toBe("0");
    expect(await out.text()).toBe('{"ok":true}');
  });

  it("skips redirects", async () => {
    const handler = withNextMarkdownRouteHandler(
      async () => new Response(null, { status: 302, headers: { Location: "/next" } }),
      {
        converter,
        debugHeaders: true,
      },
    );

    const out = await handler(
      new Request("https://example.com", { headers: { Accept: "text/markdown" } }),
      {
        params: {},
      },
    );

    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("/next");
    expect(out.headers.get("x-markdown-transformed")).toBe("0");
  });

  it("forwards context to wrapped handler", async () => {
    const spy = vi.fn(async (_req: Request, ctx: { slug: string }) => {
      return new Response(`<html><body>${ctx.slug}</body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    });

    const handler = withNextMarkdownRouteHandler(spy, {
      converter,
    });

    const context = { slug: "abc" };
    const out = await handler(
      new Request("https://example.com", { headers: { Accept: "text/markdown" } }),
      context,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.any(Request), context);
    expect(await out.text()).toContain("abc");
  });

  it("supports direct transform helper", async () => {
    const request = new Request("https://example.com", { headers: { Accept: "text/markdown" } });
    const response = new Response("<html><body>Hi</body></html>", {
      headers: { "Content-Type": "text/html" },
    });

    const out = await transformNextResponse(request, response, {
      converter,
    });

    expect(out.headers.get("content-type")).toContain("text/markdown");
  });
});
