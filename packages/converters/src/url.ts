const ABSOLUTE_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function resolveUrl(url: string | undefined, baseUrl: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    if (ABSOLUTE_SCHEME_PATTERN.test(trimmed)) {
      return new URL(trimmed).toString();
    }

    if (trimmed.startsWith('//')) {
      if (!baseUrl) {
        return undefined;
      }

      const base = new URL(baseUrl);
      return `${base.protocol}${trimmed}`;
    }

    if (!baseUrl) {
      return undefined;
    }

    return new URL(trimmed, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function shouldSkipRewrite(url: string): boolean {
  const value = url.trim().toLowerCase();
  return (
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('javascript:') ||
    value.startsWith('data:')
  );
}
