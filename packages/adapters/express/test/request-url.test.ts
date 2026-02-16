import type { Request as ExpressRequest } from "express";
import { describe, expect, it } from "vitest";

import {
  defaultRequestUrl,
  getPathnameForRequest,
  shouldTransformPathname,
} from "../src/request-url";

function mockRequest(overrides: Partial<ExpressRequest> = {}): ExpressRequest {
  const request = {
    protocol: "https",
    get: (name: string) => {
      if (name.toLowerCase() === "host") {
        return "example.com";
      }
      return undefined;
    },
    originalUrl: "/docs/getting-started?lang=en",
    url: "/docs/getting-started?lang=en",
    ...overrides,
  } as unknown as ExpressRequest;

  return request;
}

describe("express request-url helpers", () => {
  it("builds default request urls from request metadata", () => {
    const req = mockRequest();

    expect(defaultRequestUrl(req)).toBe("https://example.com/docs/getting-started?lang=en");
  });

  it("derives normalized pathnames from request urls", () => {
    const req = mockRequest();

    expect(getPathnameForRequest(req, {})).toBe("/docs/getting-started");
  });

  it("falls back to request path parsing when custom url is invalid", () => {
    const req = mockRequest({
      originalUrl: "/fallback/path/?q=1",
      url: "/fallback/path/?q=1",
    });

    const pathname = getPathnameForRequest(req, {
      getRequestUrl: () => "://bad-url",
    });

    expect(pathname).toBe("/fallback/path");
  });

  it("supports include and exclude path filtering", () => {
    const options = {
      include: ["/docs/**"],
      exclude: ["/docs/private"],
    };

    expect(shouldTransformPathname("/docs/intro", options)).toBe(true);
    expect(shouldTransformPathname("/docs/private", options)).toBe(false);
    expect(shouldTransformPathname("/blog/post", options)).toBe(false);
  });

  it("transforms all routes when include is omitted", () => {
    expect(shouldTransformPathname("/anything", {})).toBe(true);
    expect(shouldTransformPathname("/skip", { exclude: ["/skip"] })).toBe(false);
  });
});
