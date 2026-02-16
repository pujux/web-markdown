import type { Request as ExpressRequest } from "express";

import { matchesAnyPathPattern, normalizePathname, type PathPattern } from "@web-markdown/core";

export interface ExpressRequestUrlOptions {
  getRequestUrl?: (req: ExpressRequest) => string;
}

export interface ExpressPathFilterOptions {
  include?: PathPattern[];
  exclude?: PathPattern[];
}

export function defaultRequestUrl(req: ExpressRequest): string {
  const protocol = req.protocol || "http";
  const host = req.get("host") || "localhost";
  const path = req.originalUrl || req.url || "/";
  return new URL(path, `${protocol}://${host}`).toString();
}

export function getPathnameForRequest(
  req: ExpressRequest,
  options: ExpressRequestUrlOptions,
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

export function shouldTransformPathname(
  pathname: string,
  options: ExpressPathFilterOptions,
): boolean {
  if (options.exclude && matchesAnyPathPattern(pathname, options.exclude)) {
    return false;
  }

  if (options.include && options.include.length > 0) {
    return matchesAnyPathPattern(pathname, options.include);
  }

  return true;
}
