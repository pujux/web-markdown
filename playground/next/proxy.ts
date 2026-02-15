import { NextResponse } from 'next/server';

import {
  buildInternalRewriteUrl,
  normalizeRoutingOptions,
  shouldRewriteRequestToMarkdown
} from '@web-markdown/adapters-next';

const routing = normalizeRoutingOptions({
  include: ['/docs/**'],
  exclude: ['/docs/private']
});

export default function proxy(request: Request): Response {
  if (!shouldRewriteRequestToMarkdown(request, routing)) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(buildInternalRewriteUrl(request.url, routing));
}
