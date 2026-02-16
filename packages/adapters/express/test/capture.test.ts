import type { Response as ExpressResponse } from "express";
import { describe, expect, it, vi } from "vitest";

import { normalizeChunk, restoreResponseMethods } from "../src/capture";

describe("express capture helpers", () => {
  it("normalizes supported chunk shapes to buffers", () => {
    expect(normalizeChunk(Buffer.from("buf"))?.toString()).toBe("buf");
    expect(normalizeChunk("str")?.toString()).toBe("str");
    expect(normalizeChunk(new Uint8Array([97, 98]))?.toString()).toBe("ab");
  });

  it("returns undefined for unsupported or absent chunks", () => {
    expect(normalizeChunk(undefined)).toBeUndefined();
    expect(normalizeChunk(null)).toBeUndefined();
    expect(normalizeChunk({})).toBeUndefined();
  });

  it("restores monkey-patched response methods", () => {
    const originalWrite = vi.fn();
    const originalEnd = vi.fn();
    const originalFlushHeaders = vi.fn();

    const response = {
      write: vi.fn(),
      end: vi.fn(),
      flushHeaders: vi.fn(),
    } as unknown as ExpressResponse;

    restoreResponseMethods(
      response,
      originalWrite as unknown as ExpressResponse["write"],
      originalEnd as unknown as ExpressResponse["end"],
      originalFlushHeaders as unknown as ExpressResponse["flushHeaders"],
    );

    expect(response.write).toBe(originalWrite);
    expect(response.end).toBe(originalEnd);
    expect(response.flushHeaders).toBe(originalFlushHeaders);
  });
});
