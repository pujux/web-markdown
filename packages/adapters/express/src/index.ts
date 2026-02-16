import type {
  RequestHandler,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";

import type { PathPattern } from "@web-markdown/core";
import {
  toTransformFetchOptions,
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";
import { normalizeChunk, restoreResponseMethods } from "./capture";
import {
  applyFetchHeaders,
  expressHeadersToFetchHeaders,
  requestHeadersToFetchHeaders,
} from "./headers";
import { defaultRequestUrl, getPathnameForRequest, shouldTransformPathname } from "./request-url";

export type ExpressPathPattern = PathPattern;

export interface ExpressMarkdownMiddlewareOptions extends TransformFetchResponseOptions {
  getRequestUrl?: (req: ExpressRequest) => string;
  include?: ExpressPathPattern[];
  exclude?: ExpressPathPattern[];
}

interface FinalizedResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: Buffer;
}

async function finalizeTransform(
  req: ExpressRequest,
  res: ExpressResponse,
  body: Buffer,
  options: ExpressMarkdownMiddlewareOptions,
): Promise<FinalizedResponse> {
  const request = new Request(options.getRequestUrl?.(req) ?? defaultRequestUrl(req), {
    method: req.method,
    headers: requestHeadersToFetchHeaders(req.headers),
  });

  const upstream = new Response(new Uint8Array(body), {
    status: res.statusCode,
    statusText: res.statusMessage,
    headers: expressHeadersToFetchHeaders(res.getHeaders()),
  });

  const transformed = await transformFetchResponse(
    request,
    upstream,
    toTransformFetchOptions(options),
  );

  return {
    status: transformed.status,
    statusText: transformed.statusText,
    headers: transformed.headers,
    body: Buffer.from(await transformed.arrayBuffer()),
  };
}

export function createExpressMarkdownMiddleware(
  options: ExpressMarkdownMiddlewareOptions,
): RequestHandler {
  return (req, res, next) => {
    const pathname = getPathnameForRequest(req, options);
    if (!shouldTransformPathname(pathname, options)) {
      res.vary("Accept");
      if (options.debugHeaders) {
        res.setHeader("X-Markdown-Transformed", "0");
      }
      next();
      return;
    }

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalFlushHeaders = res.flushHeaders?.bind(res);

    const chunks: Buffer[] = [];
    let captureEnabled = true;
    let ended = false;

    const flushBufferedToOriginal = (): void => {
      if (chunks.length === 0) {
        return;
      }

      originalWrite(Buffer.concat(chunks));
      chunks.length = 0;
    };

    const disableCapture = (): void => {
      if (!captureEnabled) {
        return;
      }

      captureEnabled = false;
      restoreResponseMethods(res, originalWrite, originalEnd, originalFlushHeaders);
      flushBufferedToOriginal();
    };

    if (originalFlushHeaders) {
      res.flushHeaders = () => {
        disableCapture();
        originalFlushHeaders();
      };
    }

    res.write = ((
      chunk: unknown,
      encoding?: BufferEncoding,
      callback?: (error?: Error) => void,
    ) => {
      if (!captureEnabled) {
        return originalWrite(chunk as never, encoding as never, callback as never);
      }

      const normalized = normalizeChunk(chunk, encoding);
      if (!normalized) {
        disableCapture();
        return originalWrite(chunk as never, encoding as never, callback as never);
      }

      chunks.push(normalized);

      if (callback) {
        process.nextTick(callback);
      }

      return true;
    }) as ExpressResponse["write"];

    res.end = ((chunk?: unknown, encoding?: BufferEncoding, callback?: () => void) => {
      if (ended) {
        return originalEnd(chunk as never, encoding as never, callback as never);
      }

      ended = true;

      if (!captureEnabled || res.headersSent) {
        restoreResponseMethods(res, originalWrite, originalEnd, originalFlushHeaders);
        return originalEnd(chunk as never, encoding as never, callback as never);
      }

      const normalized = normalizeChunk(chunk, encoding);
      if (chunk !== undefined && chunk !== null && !normalized) {
        restoreResponseMethods(res, originalWrite, originalEnd, originalFlushHeaders);
        return originalEnd(chunk as never, encoding as never, callback as never);
      }

      if (normalized) {
        chunks.push(normalized);
      }

      restoreResponseMethods(res, originalWrite, originalEnd, originalFlushHeaders);

      const bufferedBody = Buffer.concat(chunks);

      void finalizeTransform(req, res, bufferedBody, options)
        .then((finalized) => {
          res.statusCode = finalized.status;
          if (finalized.statusText) {
            res.statusMessage = finalized.statusText;
          }

          applyFetchHeaders(res, finalized.headers);

          if (callback) {
            callback();
          }

          originalEnd(finalized.body);
        })
        .catch(next);

      return res;
    }) as ExpressResponse["end"];

    next();
  };
}
