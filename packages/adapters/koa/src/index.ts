import { matchesAnyPathPattern, mergeVary, type PathPattern } from "@web-markdown/core";
import {
  toTransformFetchOptions,
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export type KoaPathPattern = PathPattern;

export interface KoaLikeContext {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  protocol: string;
  host: string;
  url: string;
  path: string;
  status: number;
  message?: string;
  body: unknown;
  response: {
    headers: Record<string, unknown>;
  };
  set(name: string, value: string | string[]): void;
  remove(name: string): void;
}

export type KoaNext = () => Promise<void>;
export type KoaMiddleware = (ctx: KoaLikeContext, next: KoaNext) => Promise<void>;

export interface KoaMarkdownMiddlewareOptions extends TransformFetchResponseOptions {
  getRequestUrl?: (ctx: KoaLikeContext) => string;
  include?: KoaPathPattern[];
  exclude?: KoaPathPattern[];
}

function defaultRequestUrl(ctx: KoaLikeContext): string {
  const protocol = ctx.protocol || "http";
  const host = ctx.host || "localhost";
  const path = ctx.url || "/";
  return new URL(path, `${protocol}://${host}`).toString();
}

function shouldTransformPathname(pathname: string, options: KoaMarkdownMiddlewareOptions): boolean {
  if (options.exclude && matchesAnyPathPattern(pathname, options.exclude)) {
    return false;
  }

  if (options.include && options.include.length > 0) {
    return matchesAnyPathPattern(pathname, options.include);
  }

  return true;
}

function normalizeBody(body: unknown): Buffer | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  return undefined;
}

function requestHeadersToFetchHeaders(headers: KoaLikeContext["headers"]): Headers {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
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

function responseHeadersToFetchHeaders(headers: Record<string, unknown>): Headers {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const part of value) {
        out.append(name, String(part));
      }
      continue;
    }

    if (typeof value === "number" || typeof value === "string") {
      out.set(name, String(value));
      continue;
    }
  }

  return out;
}

function applyFetchHeaders(ctx: KoaLikeContext, headers: Headers): void {
  for (const name of Object.keys(ctx.response.headers)) {
    ctx.remove(name);
  }

  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      continue;
    }

    ctx.set(name, value);
  }

  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers);
    if (values.length > 0) {
      ctx.set("set-cookie", values);
    }
  }
}

function ensureVaryAccept(ctx: KoaLikeContext): void {
  const existingVary = ctx.response.headers.vary;
  const varyValue =
    typeof existingVary === "string"
      ? existingVary
      : Array.isArray(existingVary)
        ? existingVary.join(", ")
        : undefined;
  ctx.set("vary", mergeVary(varyValue, "Accept"));
}

export function createKoaMarkdownMiddleware(options: KoaMarkdownMiddlewareOptions): KoaMiddleware {
  return async (ctx, next): Promise<void> => {
    await next();

    if (!shouldTransformPathname(ctx.path, options)) {
      ensureVaryAccept(ctx);
      if (options.debugHeaders) {
        ctx.set("x-markdown-transformed", "0");
      }
      return;
    }

    const body = normalizeBody(ctx.body);
    if (!body) {
      ensureVaryAccept(ctx);
      if (options.debugHeaders) {
        ctx.set("x-markdown-transformed", "0");
      }
      return;
    }

    const request = new Request(options.getRequestUrl?.(ctx) ?? defaultRequestUrl(ctx), {
      method: ctx.method,
      headers: requestHeadersToFetchHeaders(ctx.headers),
    });

    const upstreamInit: ResponseInit = {
      status: ctx.status,
      headers: responseHeadersToFetchHeaders(ctx.response.headers),
    };
    if (ctx.message) {
      upstreamInit.statusText = ctx.message;
    }

    const upstream = new Response(new Uint8Array(body), upstreamInit);

    const transformed = await transformFetchResponse(
      request,
      upstream,
      toTransformFetchOptions(options),
    );

    ctx.status = transformed.status;
    if (transformed.statusText) {
      ctx.message = transformed.statusText;
    }

    applyFetchHeaders(ctx, transformed.headers);
    ctx.body = Buffer.from(await transformed.arrayBuffer());
  };
}
