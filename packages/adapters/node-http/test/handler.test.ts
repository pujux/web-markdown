import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it } from "vitest";

import { createDefaultConverter } from "@web-markdown/converters";

import { createNodeHttpMarkdownHandler } from "../src";

type HeaderValue = string | string[];

function createRequest(pathname: string, accept: string): IncomingMessage {
  return {
    method: "GET",
    url: pathname,
    headers: {
      host: "example.com",
      accept,
    },
    socket: {},
  } as unknown as IncomingMessage;
}

function createResponse(): {
  response: ServerResponse;
  getHeader: (name: string) => HeaderValue | undefined;
  getBody: () => string;
} {
  const headers = new Map<string, HeaderValue>();
  let body = "";

  const response = {
    statusCode: 200,
    statusMessage: "",
    headersSent: false,
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeaderNames() {
      return Array.from(headers.keys());
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase());
    },
    end(chunk?: unknown) {
      if (chunk === undefined || chunk === null) {
        body = "";
      } else if (Buffer.isBuffer(chunk)) {
        body = chunk.toString();
      } else {
        body = String(chunk);
      }
      (response as unknown as { headersSent: boolean }).headersSent = true;
    },
  } as unknown as ServerResponse;

  return {
    response,
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    getBody() {
      return body;
    },
  };
}

describe("createNodeHttpMarkdownHandler", () => {
  it("transforms html upstream responses when markdown is accepted", async () => {
    const handler = createNodeHttpMarkdownHandler(
      async () =>
        new Response("<!doctype html><html><body><main><h1>Hello</h1></main></body></html>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
            vary: "Accept-Encoding",
          },
        }),
      {
        converter: createDefaultConverter({ mode: "content", addFrontMatter: false }),
        debugHeaders: true,
      },
    );

    const req = createRequest("/docs", "text/markdown");
    const { response, getHeader, getBody } = createResponse();

    await handler(req, response);

    expect(response.statusCode).toBe(200);
    expect(String(getHeader("content-type"))).toContain("text/markdown");
    expect(String(getHeader("vary"))).toContain("Accept");
    expect(getHeader("x-markdown-transformed")).toBe("1");
    expect(getBody()).toContain("# Hello");
  });

  it("passes through html upstream responses when markdown is not acceptable", async () => {
    const handler = createNodeHttpMarkdownHandler(
      async () =>
        new Response("<html><body>Hello</body></html>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        }),
      {
        converter: createDefaultConverter(),
        debugHeaders: true,
      },
    );

    const req = createRequest("/docs", "text/html,*/*");
    const { response, getHeader, getBody } = createResponse();

    await handler(req, response);

    expect(response.statusCode).toBe(200);
    expect(String(getHeader("content-type"))).toContain("text/html");
    expect(getHeader("x-markdown-transformed")).toBe("0");
    expect(String(getHeader("vary"))).toContain("Accept");
    expect(getBody()).toContain("Hello");
  });

  it("passes through non-html responses even when markdown is accepted", async () => {
    const handler = createNodeHttpMarkdownHandler(
      async () =>
        new Response('{"ok":true}', {
          headers: {
            "content-type": "application/json",
          },
        }),
      {
        converter: createDefaultConverter(),
        debugHeaders: true,
      },
    );

    const req = createRequest("/data", "text/markdown");
    const { response, getHeader, getBody } = createResponse();

    await handler(req, response);

    expect(response.statusCode).toBe(200);
    expect(String(getHeader("content-type"))).toContain("application/json");
    expect(getHeader("x-markdown-transformed")).toBe("0");
    expect(getBody()).toContain('{"ok":true}');
  });
});
