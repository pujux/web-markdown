import { NextResponse } from "next/server";

import { buildInternalRewriteUrl, normalizeRoutingOptions, shouldRewriteRequestToMarkdownEndpoint } from "@web-markdown/adapters-next";

const routing = normalizeRoutingOptions({
  include: ["/**"],
  exclude: ["/not-markdown"],
});

export default function proxy(request: Request): Response {
  if (!shouldRewriteRequestToMarkdownEndpoint(request, routing)) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(buildInternalRewriteUrl(request.url, routing));
}
