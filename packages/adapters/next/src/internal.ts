import { transformFetchResponse, type TransformFetchResponseOptions } from '@web-markdown/transform-fetch';

import {
  normalizeRoutingOptions,
  resolveSourceUrl,
  shouldServeMarkdownForPath,
  type NextMarkdownRoutingOptions
} from './shared';

export interface NextMarkdownEndpointOptions
  extends NextMarkdownRoutingOptions,
    TransformFetchResponseOptions {
  fetchImpl?: typeof fetch;
  upstreamAcceptHeader?: string;
}

function toTransformOptions(options: NextMarkdownEndpointOptions): TransformFetchResponseOptions {
  const transformOptions: TransformFetchResponseOptions = {
    converter: options.converter
  };

  if (options.maxHtmlBytes !== undefined) {
    transformOptions.maxHtmlBytes = options.maxHtmlBytes;
  }

  if (options.oversizeBehavior !== undefined) {
    transformOptions.oversizeBehavior = options.oversizeBehavior;
  }

  if (options.debugHeaders !== undefined) {
    transformOptions.debugHeaders = options.debugHeaders;
  }

  if (options.onObservation !== undefined) {
    transformOptions.onObservation = options.onObservation;
  }

  return transformOptions;
}

function badRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}

function prepareUpstreamHeaders(
  incoming: Headers,
  bypassHeaderName: string,
  bypassHeaderValue: string,
  upstreamAcceptHeader: string
): Headers {
  const headers = new Headers(incoming);
  headers.set('accept', upstreamAcceptHeader);
  headers.set(bypassHeaderName, bypassHeaderValue);
  return headers;
}

export async function handleInternalMarkdownRequest(
  request: Request,
  options: NextMarkdownEndpointOptions
): Promise<Response> {
  const routing = normalizeRoutingOptions(options);
  const requestUrl = new URL(request.url);

  if (requestUrl.pathname !== routing.internalPath) {
    return notFound();
  }

  const sourceUrl = resolveSourceUrl(request.url, routing);
  if (!sourceUrl) {
    return badRequest('Missing or invalid markdown source URL.');
  }

  if (!shouldServeMarkdownForPath(sourceUrl.pathname, routing)) {
    return notFound();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const upstreamRequest = new Request(sourceUrl.toString(), {
    method: request.method,
    headers: prepareUpstreamHeaders(
      request.headers,
      routing.bypassHeaderName,
      routing.bypassHeaderValue,
      options.upstreamAcceptHeader ?? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'
    ),
    redirect: 'manual'
  });

  const upstreamResponse = await fetchImpl(upstreamRequest);

  const markdownRequest = new Request(sourceUrl.toString(), {
    method: request.method,
    headers: request.headers
  });

  return transformFetchResponse(markdownRequest, upstreamResponse, toTransformOptions(options));
}
