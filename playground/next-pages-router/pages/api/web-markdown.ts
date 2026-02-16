import type { NextApiRequest, NextApiResponse } from "next";

import { handleInternalMarkdownRequest } from "@web-markdown/adapters-next";

import {
  endpointOptions,
  INTERNAL_MARKER_HEADER,
  INTERNAL_MARKER_VALUE,
  routing,
} from "../../web-markdown.config";

export const config = {
  api: {
    bodyParser: false,
  },
};

function readSingleHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function requestHeadersToFetchHeaders(headers: NextApiRequest["headers"]): Headers {
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

function setNodeHeadersFromFetch(response: Response, res: NextApiResponse): void {
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(response.headers);
    if (values.length > 0) {
      res.setHeader("set-cookie", values);
    }
  }

  for (const [name, value] of response.headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      continue;
    }

    res.setHeader(name, value);
  }
}

function resolveSourceUrl(req: NextApiRequest): URL | null {
  const source = req.query.wmsource;
  const sourcePath = Array.isArray(source) ? source[0] : source;

  const forwardedProto = readSingleHeader(req.headers["x-forwarded-proto"])?.split(",")[0]?.trim();
  const forwardedHost = readSingleHeader(req.headers["x-forwarded-host"])?.split(",")[0]?.trim();
  const host = forwardedHost ?? readSingleHeader(req.headers.host) ?? "localhost:3003";
  const protocol = forwardedProto || "http";
  const origin = `${protocol}://${host}`;

  if (typeof req.url === "string" && req.url.length > 0) {
    const rewrittenUrl = new URL(req.url.startsWith("/") ? req.url : `/${req.url}`, origin);
    const rewrittenPathname = rewrittenUrl.pathname;

    if (!rewrittenPathname.startsWith(routing.internalPath)) {
      return rewrittenUrl;
    }
  }

  if (typeof sourcePath !== "string" || !sourcePath.startsWith("/")) {
    return null;
  }

  return new URL(sourcePath, origin);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const internalMarker = readSingleHeader(req.headers[INTERNAL_MARKER_HEADER]);
  if (internalMarker !== INTERNAL_MARKER_VALUE) {
    res.status(404).end("Not Found");
    return;
  }

  const sourceUrl = resolveSourceUrl(req);
  if (!sourceUrl) {
    res.status(400).end("Bad Request");
    return;
  }

  const request = new Request(sourceUrl.toString(), {
    method: req.method,
    headers: requestHeadersToFetchHeaders(req.headers),
  });

  const response = await handleInternalMarkdownRequest(request, endpointOptions);

  res.status(response.status);
  setNodeHeadersFromFetch(response, res);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}
