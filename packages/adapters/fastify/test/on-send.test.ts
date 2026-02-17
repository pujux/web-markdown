import { describe, expect, it } from "vitest";

import { createDefaultConverter } from "@web-markdown/converters";

import {
  createFastifyMarkdownOnSendHook,
  type FastifyReplyLike,
  type FastifyRequestLike,
} from "../src";

type HeaderValue = string | string[];

function createReply(initialHeaders: Record<string, HeaderValue> = {}): {
  reply: FastifyReplyLike;
  getHeader: (name: string) => HeaderValue | undefined;
} {
  const headers = new Map<string, HeaderValue>();

  for (const [name, value] of Object.entries(initialHeaders)) {
    headers.set(name.toLowerCase(), value);
  }

  const reply: FastifyReplyLike = {
    statusCode: 200,
    getHeaders() {
      return Object.fromEntries(headers.entries());
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase());
    },
    header(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
  };

  return {
    reply,
    getHeader: (name) => headers.get(name.toLowerCase()),
  };
}

function createRequest(pathname: string, accept = "text/markdown"): FastifyRequestLike {
  return {
    method: "GET",
    url: pathname,
    protocol: "https",
    hostname: "example.com",
    headers: {
      host: "example.com",
      accept,
    },
  };
}

describe("createFastifyMarkdownOnSendHook", () => {
  it("transforms html payloads for markdown requests", async () => {
    const { reply, getHeader } = createReply({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120",
    });

    const hook = createFastifyMarkdownOnSendHook({
      converter: createDefaultConverter({ mode: "content", addFrontMatter: false }),
      debugHeaders: true,
    });

    const out = await hook(
      createRequest("/docs"),
      reply,
      "<!doctype html><html><body><main><h1>Hello</h1></main></body></html>",
    );

    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out?.toString()).toContain("# Hello");
    expect(String(getHeader("content-type"))).toContain("text/markdown");
    expect(getHeader("x-markdown-transformed")).toBe("1");
    expect(String(getHeader("vary"))).toContain("Accept");
  });

  it("keeps excluded routes as passthrough and still sets vary/debug headers", async () => {
    const { reply, getHeader } = createReply({
      "content-type": "text/html; charset=utf-8",
    });

    const hook = createFastifyMarkdownOnSendHook({
      converter: createDefaultConverter(),
      include: ["/docs/**"],
      exclude: ["/docs/private"],
      debugHeaders: true,
    });

    const payload = "<html><body>Private</body></html>";
    const out = await hook(createRequest("/docs/private"), reply, payload);

    expect(out).toBe(payload);
    expect(String(getHeader("content-type"))).toContain("text/html");
    expect(getHeader("x-markdown-transformed")).toBe("0");
    expect(String(getHeader("vary"))).toContain("Accept");
  });

  it("passes through non-html payloads unchanged", async () => {
    const { reply, getHeader } = createReply({
      "content-type": "text/csv; charset=utf-8",
    });

    const hook = createFastifyMarkdownOnSendHook({
      converter: createDefaultConverter(),
      debugHeaders: true,
    });

    const payload = "id,name\n1,alpha\n";
    const out = await hook(createRequest("/file"), reply, payload);

    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out?.toString()).toBe(payload);
    expect(String(getHeader("content-type"))).toContain("text/csv");
    expect(getHeader("x-markdown-transformed")).toBe("0");
  });
});
