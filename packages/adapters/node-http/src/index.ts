import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import {
  toTransformFetchOptions,
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export interface NodeHttpMarkdownHandlerOptions extends TransformFetchResponseOptions {
  getRequestUrl?: (req: IncomingMessage) => string;
}

export interface NodeHttpRequestContext {
  req: IncomingMessage;
  request: Request;
}

export type NodeHttpUpstreamHandler = (
  context: NodeHttpRequestContext,
) => Response | Promise<Response>;

export type NodeHttpHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

function getHeaderValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  const value = headers[lowerName] ?? headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function defaultRequestUrl(req: IncomingMessage): string {
  const protocol =
    req.socket && "encrypted" in req.socket && req.socket.encrypted ? "https" : "http";
  const host =
    getHeaderValue(req.headers, "x-forwarded-host") || getHeaderValue(req.headers, "host");
  const path = req.url || "/";
  return new URL(path, `${protocol}://${host || "localhost"}`).toString();
}

function requestHeadersToFetchHeaders(headers: IncomingHttpHeaders): Headers {
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

function buildRequest(req: IncomingMessage, requestUrl: string): Request {
  const method = (req.method || "GET").toUpperCase();
  const headers = requestHeadersToFetchHeaders(req.headers);

  if (method === "GET" || method === "HEAD") {
    return new Request(requestUrl, {
      method,
      headers,
    });
  }

  return new Request(requestUrl, {
    method,
    headers,
    body: req as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function writeResponseHeaders(res: ServerResponse, headers: Headers): void {
  if (typeof res.getHeaderNames === "function") {
    for (const name of res.getHeaderNames()) {
      res.removeHeader(name);
    }
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

async function sendFetchResponse(
  res: ServerResponse,
  response: Response,
  method: string,
): Promise<void> {
  res.statusCode = response.status;
  if (response.statusText) {
    res.statusMessage = response.statusText;
  }

  writeResponseHeaders(res, response.headers);

  if (method === "HEAD") {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export function createNodeHttpMarkdownHandler(
  upstream: NodeHttpUpstreamHandler,
  options: NodeHttpMarkdownHandlerOptions,
): NodeHttpHandler {
  return async (req, res): Promise<void> => {
    try {
      const requestUrl = options.getRequestUrl?.(req) ?? defaultRequestUrl(req);
      const request = buildRequest(req, requestUrl);

      const upstreamResponse = await upstream({
        req,
        request,
      });

      const transformed = await transformFetchResponse(
        request,
        upstreamResponse,
        toTransformFetchOptions(options),
      );

      await sendFetchResponse(res, transformed, (req.method || "GET").toUpperCase());
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "text/plain; charset=utf-8");
      }
      res.end("Internal Server Error");
    }
  };
}
