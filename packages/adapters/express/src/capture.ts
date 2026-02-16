import type { Response as ExpressResponse } from "express";

export function normalizeChunk(chunk: unknown, encoding?: BufferEncoding): Buffer | undefined {
  if (chunk === undefined || chunk === null) {
    return undefined;
  }

  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }

  if (typeof chunk === "string") {
    return Buffer.from(chunk, encoding ?? "utf8");
  }

  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }

  return undefined;
}

export function restoreResponseMethods(
  res: ExpressResponse,
  originalWrite: ExpressResponse["write"],
  originalEnd: ExpressResponse["end"],
  originalFlushHeaders: ExpressResponse["flushHeaders"] | undefined,
): void {
  res.write = originalWrite;
  res.end = originalEnd;

  if (originalFlushHeaders) {
    res.flushHeaders = originalFlushHeaders;
  }
}
