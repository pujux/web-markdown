import { describe, expect, it } from "vitest";

import { mergeVary } from "../src/vary";

describe("mergeVary", () => {
  it("adds a new vary token", () => {
    expect(mergeVary("Accept-Encoding", "Accept")).toBe("Accept-Encoding, Accept");
  });

  it("deduplicates case-insensitively", () => {
    expect(mergeVary("accept, Accept-Encoding", "Accept")).toBe("accept, Accept-Encoding");
  });

  it("keeps wildcard vary", () => {
    expect(mergeVary("*", "Accept")).toBe("*");
  });

  it("handles empty existing header", () => {
    expect(mergeVary(undefined, "Accept")).toBe("Accept");
  });
});
