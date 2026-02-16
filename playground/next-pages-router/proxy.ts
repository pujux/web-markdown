import { NextResponse } from "next/server";

import {
  buildInternalRewriteUrl,
  shouldRewriteRequestToMarkdownEndpoint,
} from "@web-markdown/adapters-next";

import { INTERNAL_MARKER_HEADER, INTERNAL_MARKER_VALUE, routing } from "./web-markdown.config";

function withSanitizedHeaders(headers: Headers): Headers {
  const out = new Headers(headers);
  out.delete(INTERNAL_MARKER_HEADER);
  return out;
}

export default function proxy(request: Request): Response {
  const headers = withSanitizedHeaders(request.headers);

  if (!shouldRewriteRequestToMarkdownEndpoint(request, routing)) {
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }

  headers.set(INTERNAL_MARKER_HEADER, INTERNAL_MARKER_VALUE);

  return NextResponse.rewrite(buildInternalRewriteUrl(request.url, routing), {
    request: {
      headers,
    },
  });
}
