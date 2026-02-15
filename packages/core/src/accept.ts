import type { HeaderRecord } from './types';

interface ParsedAcceptEntry {
  mediaType: string;
  q: number;
  order: number;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseQValue(raw: string): number {
  const cleaned = raw.trim().replace(/^"|"$/g, '');
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed > 1 ? 1 : parsed;
}

function parseAcceptHeader(accept: string): ParsedAcceptEntry[] {
  return splitCsv(accept).map((entry, order) => {
    const segments = entry.split(';').map((segment) => segment.trim());
    const mediaType = (segments[0] ?? '').toLowerCase();

    let q = 1;

    for (const segment of segments.slice(1)) {
      const [key, value] = segment.split('=');
      if (key?.trim().toLowerCase() !== 'q' || value === undefined) {
        continue;
      }

      q = parseQValue(value);
      break;
    }

    return { mediaType, q, order };
  });
}

function getHeaderValue(headers: Headers | HeaderRecord, name: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const lowerName = name.toLowerCase();
  const exact = headers[name] ?? headers[lowerName];

  if (exact === undefined) {
    return null;
  }

  if (Array.isArray(exact)) {
    return exact.join(', ');
  }

  return typeof exact === 'string' ? exact : exact.join(', ');
}

export function acceptsMarkdown(headers: Headers | HeaderRecord): boolean {
  const accept = getHeaderValue(headers, 'accept');

  if (!accept) {
    return false;
  }

  const matches = parseAcceptHeader(accept)
    .filter((entry) => entry.mediaType === 'text/markdown')
    .sort((left, right) => right.q - left.q || left.order - right.order);

  if (matches.length === 0) {
    return false;
  }

  return matches[0]!.q > 0;
}
