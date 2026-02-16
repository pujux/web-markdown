import { describe, expect, it } from "vitest";

import {
  applyMarkdownVary,
  normalizeRoutingOptions,
  shouldRewriteRequestToMarkdown,
  shouldRewriteRequestToMarkdownEndpoint,
  shouldServeMarkdownForPath,
} from "../src/shared";

describe("next shared routing", () => {
  it("excludes non-page paths by default", () => {
    const options = normalizeRoutingOptions();

    expect(shouldServeMarkdownForPath("/api/hello", options)).toBe(false);
    expect(shouldServeMarkdownForPath("/_next/static/chunk.js", options)).toBe(false);
    expect(shouldServeMarkdownForPath("/assets/image.png", options)).toBe(false);
    expect(shouldServeMarkdownForPath("/docs/getting-started", options)).toBe(true);
  });

  it("supports include and exclude patterns", () => {
    const options = normalizeRoutingOptions({
      include: ["/docs/**"],
      exclude: ["/docs/private"],
    });

    expect(shouldServeMarkdownForPath("/docs/intro", options)).toBe(true);
    expect(shouldServeMarkdownForPath("/docs/private", options)).toBe(false);
    expect(shouldServeMarkdownForPath("/blog/post", options)).toBe(false);
  });

  it("decides rewrite only for markdown GET/HEAD requests", () => {
    const options = normalizeRoutingOptions();

    const markdownGet = new Request("https://example.com/docs", {
      method: "GET",
      headers: {
        Accept: "text/markdown",
      },
    });

    const htmlGet = new Request("https://example.com/docs", {
      method: "GET",
      headers: {
        Accept: "text/html,*/*",
      },
    });

    const markdownPost = new Request("https://example.com/docs", {
      method: "POST",
      headers: {
        Accept: "text/markdown",
      },
    });

    expect(shouldRewriteRequestToMarkdown(markdownGet, options)).toBe(true);
    expect(shouldRewriteRequestToMarkdown(htmlGet, options)).toBe(false);
    expect(shouldRewriteRequestToMarkdown(markdownPost, options)).toBe(false);
  });

  it("skips rewrite for bypassed requests", () => {
    const options = normalizeRoutingOptions();

    const bypassed = new Request("https://example.com/docs", {
      headers: {
        Accept: "text/markdown",
        "x-web-markdown-bypass": "1",
      },
    });

    expect(shouldRewriteRequestToMarkdown(bypassed, options)).toBe(false);
  });

  it("routes non-markdown requests to the internal endpoint for vary-safe passthrough", () => {
    const options = normalizeRoutingOptions({
      include: ["/docs/**"],
      exclude: ["/docs/private"],
    });

    const htmlGet = new Request("https://example.com/docs", {
      method: "GET",
      headers: {
        Accept: "text/html,*/*",
      },
    });

    const excluded = new Request("https://example.com/docs/private", {
      method: "GET",
      headers: {
        Accept: "text/markdown",
      },
    });

    const apiPath = new Request("https://example.com/api/health", {
      method: "GET",
      headers: {
        Accept: "text/html,*/*",
      },
    });

    const appRouterFlight = new Request("https://example.com/docs", {
      method: "GET",
      headers: {
        Accept: "text/x-component",
        RSC: "1",
        "Next-Router-State-Tree": '["",{}]',
      },
    });

    expect(shouldRewriteRequestToMarkdownEndpoint(htmlGet, options)).toBe(true);
    expect(shouldRewriteRequestToMarkdownEndpoint(excluded, options)).toBe(true);
    expect(shouldRewriteRequestToMarkdownEndpoint(apiPath, options)).toBe(false);
    expect(shouldRewriteRequestToMarkdownEndpoint(appRouterFlight, options)).toBe(false);
  });

  it("skips app-router flight requests for markdown rewrite checks", () => {
    const options = normalizeRoutingOptions();

    const flightMarkdown = new Request("https://example.com/docs", {
      method: "GET",
      headers: {
        Accept: "text/markdown, text/x-component",
        RSC: "1",
      },
    });

    expect(shouldRewriteRequestToMarkdown(flightMarkdown, options)).toBe(false);
  });

  it("adds Accept to vary when missing", () => {
    const response = new Response("ok");

    applyMarkdownVary(response);

    expect(response.headers.get("vary")).toBe("Accept");
  });

  it("merges Accept into existing vary", () => {
    const response = new Response("ok", {
      headers: {
        Vary: "rsc, Accept-Encoding",
      },
    });

    applyMarkdownVary(response);

    expect(response.headers.get("vary")).toBe("rsc, Accept-Encoding, Accept");
  });

  it("does not duplicate Accept in vary", () => {
    const response = new Response("ok", {
      headers: {
        Vary: "Accept, Accept-Encoding",
      },
    });

    applyMarkdownVary(response);

    expect(response.headers.get("vary")).toBe("Accept, Accept-Encoding");
  });
});
