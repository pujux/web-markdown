import { NextResponse } from 'next/server';

import {
  buildInternalRewriteUrl,
  normalizeRoutingOptions,
  shouldRewriteRequestToMarkdown,
  type NextMarkdownRoutingOptions
} from './shared';

export type NextMarkdownMiddleware = (
  request: Pick<Request, 'url' | 'headers' | 'method'>
) => Response | undefined;

export function createNextMarkdownMiddleware(
  options: NextMarkdownRoutingOptions = {}
): NextMarkdownMiddleware {
  const routing = normalizeRoutingOptions(options);

  return (request) => {
    if (!shouldRewriteRequestToMarkdown(request, routing)) {
      return undefined;
    }

    const rewriteUrl = buildInternalRewriteUrl(request.url, routing);
    return NextResponse.rewrite(rewriteUrl);
  };
}
