export type PathPattern = string | RegExp | ((pathname: string) => boolean);

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

export function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

export function matchesPathPattern(pathname: string, pattern: PathPattern): boolean {
  const normalizedPath = normalizePathname(pathname);

  if (typeof pattern === "function") {
    return pattern(normalizedPath);
  }

  if (typeof pattern === "string") {
    return matchesStringPattern(pattern, normalizedPath);
  }

  return pattern.test(normalizedPath);
}

export function matchesAnyPathPattern(pathname: string, patterns: readonly PathPattern[]): boolean {
  return patterns.some((pattern) => matchesPathPattern(pathname, pattern));
}
