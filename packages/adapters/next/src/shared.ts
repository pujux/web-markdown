import { acceptsMarkdown } from "@web-markdown/core";

export type NextPathPattern = string | RegExp | ((pathname: string) => boolean);

export interface NextMarkdownRoutingOptions {
  include?: NextPathPattern[];
  exclude?: NextPathPattern[];
  internalPath?: string;
  sourceQueryParam?: string;
  bypassHeaderName?: string;
  bypassHeaderValue?: string;
}

export interface NormalizedNextMarkdownRoutingOptions {
  include: NextPathPattern[];
  exclude: NextPathPattern[];
  internalPath: string;
  sourceQueryParam: string;
  bypassHeaderName: string;
  bypassHeaderValue: string;
}

const DEFAULT_INTERNAL_PATH = "api/web-markdown";
const DEFAULT_SOURCE_QUERY_PARAM = "wmsource";
const DEFAULT_BYPASS_HEADER_NAME = "x-web-markdown-bypass";
const DEFAULT_BYPASS_HEADER_VALUE = "1";

const DEFAULT_EXCLUDE_PREFIXES = ["/_next", "/api"];
const DEFAULT_EXCLUDE_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml", "/manifest.json"];
const ASSET_PATH_PATTERN = /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|mjs|png|svg|txt|webp|woff|woff2|ttf|eot|otf|xml|pdf|zip)$/i;

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

export function pathMatchesPattern(pathname: string, pattern: NextPathPattern): boolean {
  if (typeof pattern === "function") {
    return pattern(pathname);
  }

  if (typeof pattern === "string") {
    return matchesStringPattern(pattern, pathname);
  }

  return pattern.test(pathname);
}

function pathMatchesAny(pathname: string, patterns: NextPathPattern[]): boolean {
  return patterns.some((pattern) => pathMatchesPattern(pathname, pattern));
}

function pathStartsWithPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) {
    return true;
  }

  return pathname.startsWith(`${prefix}/`);
}

function isDefaultExcluded(pathname: string): boolean {
  if (DEFAULT_EXCLUDE_EXACT.includes(pathname)) {
    return true;
  }

  if (DEFAULT_EXCLUDE_PREFIXES.some((prefix) => pathStartsWithPrefix(pathname, prefix))) {
    return true;
  }

  return ASSET_PATH_PATTERN.test(pathname);
}

export function normalizeRoutingOptions(options: NextMarkdownRoutingOptions = {}): NormalizedNextMarkdownRoutingOptions {
  return {
    include: options.include ?? [],
    exclude: options.exclude ?? [],
    internalPath: normalizePathname(options.internalPath ?? DEFAULT_INTERNAL_PATH),
    sourceQueryParam: options.sourceQueryParam ?? DEFAULT_SOURCE_QUERY_PARAM,
    bypassHeaderName: (options.bypassHeaderName ?? DEFAULT_BYPASS_HEADER_NAME).toLowerCase(),
    bypassHeaderValue: options.bypassHeaderValue ?? DEFAULT_BYPASS_HEADER_VALUE,
  };
}

export function shouldServeMarkdownForPath(pathname: string, options: NormalizedNextMarkdownRoutingOptions): boolean {
  const normalizedPath = normalizePathname(pathname);

  if (pathStartsWithPrefix(normalizedPath, options.internalPath)) {
    return false;
  }

  if (isDefaultExcluded(normalizedPath)) {
    return false;
  }

  if (pathMatchesAny(normalizedPath, options.exclude)) {
    return false;
  }

  if (options.include.length > 0) {
    return pathMatchesAny(normalizedPath, options.include);
  }

  return true;
}

export function shouldRewriteRequestToMarkdown(
  request: Pick<Request, "url" | "headers" | "method">,
  options: NormalizedNextMarkdownRoutingOptions,
): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  const bypassHeader = request.headers.get(options.bypassHeaderName);
  if (bypassHeader && bypassHeader === options.bypassHeaderValue) {
    return false;
  }

  if (!acceptsMarkdown(request.headers)) {
    return false;
  }

  const url = new URL(request.url);
  return shouldServeMarkdownForPath(url.pathname, options);
}

export function buildInternalRewriteUrl(requestUrl: string, options: NormalizedNextMarkdownRoutingOptions): URL {
  const original = new URL(requestUrl);
  const internal = new URL(options.internalPath, original.origin);
  internal.searchParams.set(options.sourceQueryParam, `${original.pathname}${original.search}`);
  return internal;
}
