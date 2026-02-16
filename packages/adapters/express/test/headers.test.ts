import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { describe, expect, it } from "vitest";

import {
  applyFetchHeaders,
  expressHeadersToFetchHeaders,
  requestHeadersToFetchHeaders,
} from "../src/headers";

type HeaderStoreValue = string | string[];

function createFakeResponse(initial: Record<string, HeaderStoreValue> = {}): {
  response: ExpressResponse;
  getHeader: (name: string) => HeaderStoreValue | undefined;
} {
  const store = new Map<string, HeaderStoreValue>();

  for (const [name, value] of Object.entries(initial)) {
    store.set(name.toLowerCase(), value);
  }

  const response = {
    getHeaderNames: () => Array.from(store.keys()),
    removeHeader: (name: string) => {
      store.delete(name.toLowerCase());
    },
    setHeader: (name: string, value: unknown) => {
      if (Array.isArray(value)) {
        store.set(
          name.toLowerCase(),
          value.map((part) => String(part)),
        );
        return;
      }

      store.set(name.toLowerCase(), String(value));
    },
  } as unknown as ExpressResponse;

  return {
    response,
    getHeader: (name: string) => store.get(name.toLowerCase()),
  };
}

describe("express header helpers", () => {
  it("converts node response header maps to fetch headers", () => {
    const headers = expressHeadersToFetchHeaders({
      "cache-control": "public, max-age=60",
      "x-retry-count": 2,
      "set-cookie": ["a=1", "b=2"],
      skip: undefined,
    });

    expect(headers.get("cache-control")).toBe("public, max-age=60");
    expect(headers.get("x-retry-count")).toBe("2");
    expect(headers.get("set-cookie")).toContain("a=1");
  });

  it("converts incoming request headers to fetch headers", () => {
    const headers = requestHeadersToFetchHeaders({
      accept: ["text/html", "text/markdown;q=0.9"],
      host: "example.com",
    } as unknown as ExpressRequest["headers"]);

    expect(headers.get("accept")).toContain("text/markdown;q=0.9");
    expect(headers.get("host")).toBe("example.com");
  });

  it("replaces existing response headers and preserves set-cookie arrays", () => {
    const { response, getHeader } = createFakeResponse({
      "content-type": "text/html",
      "x-old-header": "1",
    });

    const headers = new Headers({
      "content-type": "text/markdown; charset=utf-8",
      vary: "Accept",
    });
    (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => ["a=1", "b=2"];

    applyFetchHeaders(response, headers);

    expect(getHeader("content-type")).toBe("text/markdown; charset=utf-8");
    expect(getHeader("vary")).toBe("Accept");
    expect(getHeader("x-old-header")).toBeUndefined();
    expect(getHeader("set-cookie")).toEqual(["a=1", "b=2"]);
  });
});
