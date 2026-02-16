import type {
  RequestHandler,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";

import {
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export type ExpressPathPattern = string | RegExp | ((pathname: string) => boolean);

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

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function headerValueToString(value: string | number | readonly string[]): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function expressHeadersToFetchHeaders(
  headers: ExpressResponse["getHeaders"] extends () => infer T ? T : never,
): Headers {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (!isDefined(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const part of value) {
        out.append(name, String(part));
      }
      continue;
    }

    out.set(name, headerValueToString(value));
  }

  return out;
}

function requestHeadersToFetchHeaders(headers: ExpressRequest["headers"]): Headers {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (!isDefined(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const part of value) {
        out.append(name, part);
      }
      continue;
    }

    out.set(name, value);
  }

  return out;
}

function defaultRequestUrl(req: ExpressRequest): string {
  const protocol = req.protocol || "http";
  const host = req.get("host") || "localhost";
  const path = req.originalUrl || req.url || "/";
  return new URL(path, `${protocol}://${host}`).toString();
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function matchesStringPattern(pattern: string, pathname: string): boolean {
  if (pattern.includes("*")) {
    return globToRegExp(normalizePathname(pattern)).test(pathname);
  }

  const normalizedPattern = normalizePathname(pattern);
  if (pathname === normalizedPattern) {
    return true;
  }

  if (normalizedPattern === "/") {
    return true;
  }

  return pathname.startsWith(`${normalizedPattern}/`);
}

function pathMatchesPattern(pathname: string, pattern: ExpressPathPattern): boolean {
  if (typeof pattern === "function") {
    return pattern(pathname);
  }

  if (typeof pattern === "string") {
    return matchesStringPattern(pattern, pathname);
  }

  return pattern.test(pathname);
}

function pathMatchesAny(pathname: string, patterns: ExpressPathPattern[]): boolean {
  return patterns.some((pattern) => pathMatchesPattern(pathname, pattern));
}

function getPathnameForRequest(
  req: ExpressRequest,
  options: ExpressMarkdownMiddlewareOptions,
): string {
  try {
    const requestUrl = options.getRequestUrl?.(req) ?? defaultRequestUrl(req);
    return normalizePathname(new URL(requestUrl).pathname);
  } catch {
    const raw = req.originalUrl || req.url || "/";
    const pathname = raw.split("?")[0] ?? "/";
    return normalizePathname(pathname);
  }
}

function shouldTransformPathname(
  pathname: string,
  options: ExpressMarkdownMiddlewareOptions,
): boolean {
  if (options.exclude && pathMatchesAny(pathname, options.exclude)) {
    return false;
  }

  if (options.include && options.include.length > 0) {
    return pathMatchesAny(pathname, options.include);
  }

  return true;
}

function normalizeChunk(chunk: unknown, encoding?: BufferEncoding): Buffer | undefined {
  if (!isDefined(chunk)) {
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

function restoreResponseMethods(
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

function applyFetchHeaders(res: ExpressResponse, headers: Headers): void {
  for (const name of res.getHeaderNames()) {
    res.removeHeader(name);
  }

  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      continue;
    }

    res.setHeader(name, value);
  }

  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers);
    if (values.length > 0) {
      res.setHeader("set-cookie", values);
    }
  }
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

  const transformOptions: TransformFetchResponseOptions = {
    converter: options.converter,
  };

  if (options.maxHtmlBytes !== undefined) {
    transformOptions.maxHtmlBytes = options.maxHtmlBytes;
  }

  if (options.oversizeBehavior !== undefined) {
    transformOptions.oversizeBehavior = options.oversizeBehavior;
  }

  if (options.debugHeaders !== undefined) {
    transformOptions.debugHeaders = options.debugHeaders;
  }

  if (options.onObservation !== undefined) {
    transformOptions.onObservation = options.onObservation;
  }

  const transformed = await transformFetchResponse(request, upstream, transformOptions);

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
      if (isDefined(chunk) && !normalized) {
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
