function splitVary(value: string): string[] {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

export function mergeVary(existing: string | null | undefined, value: string): string {
  const existingTokens = splitVary(existing ?? '');

  if (existingTokens.some((token) => token === '*')) {
    return '*';
  }

  const incomingTokens = splitVary(value);
  const seen = new Set(existingTokens.map((token) => token.toLowerCase()));

  for (const incoming of incomingTokens) {
    const key = incoming.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    existingTokens.push(incoming);
    seen.add(key);
  }

  return existingTokens.join(', ');
}
