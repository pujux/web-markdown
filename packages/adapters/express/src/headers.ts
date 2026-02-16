import type { Request as ExpressRequest, Response as ExpressResponse } from "express";

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function headerValueToString(value: string | number | readonly string[]): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

export function expressHeadersToFetchHeaders(
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

export function requestHeadersToFetchHeaders(headers: ExpressRequest["headers"]): Headers {
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

export function applyFetchHeaders(res: ExpressResponse, headers: Headers): void {
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
