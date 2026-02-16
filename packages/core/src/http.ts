const HTML_TYPE_PATTERN = /^(text\/html|application\/xhtml\+xml)\b/i;
const HTML_START_PATTERN =
  /^(?:\ufeff)?\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b|<main\b|<article\b)/i;

export function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

export function isHtmlContentType(contentType: string | null | undefined): boolean {
  if (!contentType) {
    return false;
  }

  return HTML_TYPE_PATTERN.test(contentType.trim());
}

export function isLikelyHtmlDocument(body: string): boolean {
  return HTML_START_PATTERN.test(body);
}
