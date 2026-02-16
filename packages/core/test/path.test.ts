import { describe, expect, it } from "vitest";

import {
  matchesAnyPathPattern,
  matchesPathPattern,
  normalizePathname,
  type PathPattern,
} from "../src/path";

describe("path helpers", () => {
  it("normalizes pathnames", () => {
    expect(normalizePathname("")).toBe("/");
    expect(normalizePathname("docs")).toBe("/docs");
    expect(normalizePathname("/docs/")).toBe("/docs");
    expect(normalizePathname("/")).toBe("/");
  });

  it("matches exact and nested string patterns", () => {
    expect(matchesPathPattern("/docs", "/docs")).toBe(true);
    expect(matchesPathPattern("/docs/page", "/docs")).toBe(true);
    expect(matchesPathPattern("/blog", "/docs")).toBe(false);
    expect(matchesPathPattern("/anything", "/")).toBe(true);
  });

  it("matches glob patterns", () => {
    expect(matchesPathPattern("/docs/guide", "/docs/*")).toBe(true);
    expect(matchesPathPattern("/docs/guide/a", "/docs/*")).toBe(false);
    expect(matchesPathPattern("/docs/guide/a", "/docs/**")).toBe(true);
  });

  it("matches function and regex patterns", () => {
    const fnPattern: PathPattern = (pathname) => pathname.startsWith("/admin");

    expect(matchesPathPattern("/admin/users", fnPattern)).toBe(true);
    expect(matchesPathPattern("/docs/users", fnPattern)).toBe(false);
    expect(matchesPathPattern("/blog/post", /^\/blog\//)).toBe(true);
    expect(matchesPathPattern("/docs/post", /^\/blog\//)).toBe(false);
  });

  it("matches any pattern in a list", () => {
    const patterns: PathPattern[] = ["/docs/**", /^\/blog\//];

    expect(matchesAnyPathPattern("/docs/intro", patterns)).toBe(true);
    expect(matchesAnyPathPattern("/blog/post", patterns)).toBe(true);
    expect(matchesAnyPathPattern("/about", patterns)).toBe(false);
  });
});
