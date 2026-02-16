interface ReadBodyResult {
  overflow: boolean;
  text: string;
  bytes: number;
}

function extractCharset(contentType: string | null): string | undefined {
  if (!contentType) {
    return undefined;
  }

  const match = contentType.match(/charset=([^;\s]+)/i);
  return match?.[1]?.trim().replace(/^"|"$/g, "");
}

function concatChunks(chunks: Uint8Array[], size: number): Uint8Array {
  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

export async function readBodyTextWithLimit(
  response: Response,
  maxBytes: number,
): Promise<ReadBodyResult> {
  if (!response.body) {
    return { overflow: false, text: "", bytes: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    bytes += value.byteLength;
    if (bytes > maxBytes) {
      void reader.cancel();
      return { overflow: true, text: "", bytes };
    }

    chunks.push(value);
  }

  const body = concatChunks(chunks, bytes);
  const charset = extractCharset(response.headers.get("content-type"));

  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset ?? "utf-8");
  } catch {
    decoder = new TextDecoder("utf-8");
  }

  return {
    overflow: false,
    text: decoder.decode(body),
    bytes,
  };
}
