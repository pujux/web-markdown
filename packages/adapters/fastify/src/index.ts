import {
  matchesAnyPathPattern,
  mergeVary,
  normalizePathname,
  type PathPattern,
} from "@web-markdown/core";
import {
  toTransformFetchOptions,
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export type FastifyPathPattern = PathPattern;

export interface FastifyRequestLike {
  method: string;
  url: string;
  protocol?: string;
  hostname?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface FastifyReplyLike {
  statusCode: number;
  getHeaders(): Record<string, unknown>;
  removeHeader(name: string): void;
  header(name: string, value: string | string[]): unknown;
}

export type FastifyHookPayload = string | Buffer | Uint8Array | null | undefined;

export interface FastifyMarkdownOnSendOptions extends TransformFetchResponseOptions {
  getRequestUrl?: (request: FastifyRequestLike) => string;
  include?: FastifyPathPattern[];
  exclude?: FastifyPathPattern[];
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lowerName = name.toLowerCase();
  const value = headers[lowerName] ?? headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function defaultRequestUrl(request: FastifyRequestLike): string {
  const protocol = request.protocol || "http";
  const host =
    getHeaderValue(request.headers, "x-forwarded-host") ||
    getHeaderValue(request.headers, "host") ||
    request.hostname ||
    "localhost";
  const path = request.url || "/";
  return new URL(path, `${protocol}://${host}`).toString();
}

function getPathnameForRequest(
  request: FastifyRequestLike,
  options: FastifyMarkdownOnSendOptions,
): string {
  try {
    const requestUrl = options.getRequestUrl?.(request) ?? defaultRequestUrl(request);
    return normalizePathname(new URL(requestUrl).pathname);
  } catch {
    const raw = request.url || "/";
    const pathname = raw.split("?")[0] ?? "/";
    return normalizePathname(pathname);
  }
}

function shouldTransformPathname(pathname: string, options: FastifyMarkdownOnSendOptions): boolean {
  if (options.exclude && matchesAnyPathPattern(pathname, options.exclude)) {
    return false;
  }

  if (options.include && options.include.length > 0) {
    return matchesAnyPathPattern(pathname, options.include);
  }

  return true;
}

function normalizePayload(payload: FastifyHookPayload): Buffer | undefined {
  if (payload === undefined || payload === null) {
    return undefined;
  }

  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    return Buffer.from(payload);
  }

  if (payload instanceof Uint8Array) {
    return Buffer.from(payload);
  }

  return undefined;
}

function requestHeadersToFetchHeaders(headers: FastifyRequestLike["headers"]): Headers {
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

function replyHeadersToFetchHeaders(headers: Record<string, unknown>): Headers {
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

function applyFetchHeaders(reply: FastifyReplyLike, headers: Headers): void {
  for (const name of Object.keys(reply.getHeaders())) {
    reply.removeHeader(name);
  }

  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      continue;
    }

    reply.header(name, value);
  }

  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers);
    if (values.length > 0) {
      reply.header("set-cookie", values);
    }
  }
}

function ensureVaryAccept(reply: FastifyReplyLike): void {
  const existingVary = reply.getHeaders().vary;
  const varyValue =
    typeof existingVary === "string"
      ? existingVary
      : Array.isArray(existingVary)
        ? existingVary.join(", ")
        : undefined;
  reply.header("vary", mergeVary(varyValue, "Accept"));
}

export function createFastifyMarkdownOnSendHook(options: FastifyMarkdownOnSendOptions) {
  return async function fastifyMarkdownOnSendHook(
    request: FastifyRequestLike,
    reply: FastifyReplyLike,
    payload: FastifyHookPayload,
  ): Promise<FastifyHookPayload> {
    const pathname = getPathnameForRequest(request, options);

    if (!shouldTransformPathname(pathname, options)) {
      ensureVaryAccept(reply);
      if (options.debugHeaders) {
        reply.header("x-markdown-transformed", "0");
      }
      return payload;
    }

    const normalizedPayload = normalizePayload(payload);
    if (!normalizedPayload) {
      ensureVaryAccept(reply);
      if (options.debugHeaders) {
        reply.header("x-markdown-transformed", "0");
      }
      return payload;
    }

    const requestObject = new Request(
      options.getRequestUrl?.(request) ?? defaultRequestUrl(request),
      {
        method: request.method,
        headers: requestHeadersToFetchHeaders(request.headers),
      },
    );

    const upstream = new Response(new Uint8Array(normalizedPayload), {
      status: reply.statusCode,
      headers: replyHeadersToFetchHeaders(reply.getHeaders()),
    });

    const transformed = await transformFetchResponse(
      requestObject,
      upstream,
      toTransformFetchOptions(options),
    );

    applyFetchHeaders(reply, transformed.headers);
    return Buffer.from(await transformed.arrayBuffer());
  };
}
