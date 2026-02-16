import {
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

import {
  normalizeRoutingOptions,
  shouldRoutePathToMarkdownEndpoint,
  shouldServeMarkdownForPath,
  type NextMarkdownRoutingOptions,
} from "./shared";

export interface NextMarkdownEndpointOptions
  extends NextMarkdownRoutingOptions, TransformFetchResponseOptions {
  fetchImpl?: typeof fetch;
  upstreamAcceptHeader?: string;
}

function toTransformOptions(options: NextMarkdownEndpointOptions): TransformFetchResponseOptions {
  const transformOptions: TransformFetchResponseOptions = {
    converter: options.converter,
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

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function prepareUpstreamHeaders(
  incoming: Headers,
  bypassHeaderName: string,
  bypassHeaderValue: string,
  upstreamAcceptHeader: string,
): Headers {
  const headers = new Headers(incoming);
  headers.set("accept", upstreamAcceptHeader);
  headers.set("accept-encoding", "identity");
  headers.set(bypassHeaderName, bypassHeaderValue);
  return headers;
}

function sanitizeUpstreamHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const hadContentEncoding = headers.has("content-encoding");

  headers.delete("vary");

  if (hadContentEncoding) {
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("etag");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withHtmlOnlyAccept(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
  return new Request(request.url, {
    method: request.method,
    headers,
  });
}

export async function handleInternalMarkdownRequest(
  request: Request,
  options: NextMarkdownEndpointOptions,
): Promise<Response> {
  const routing = normalizeRoutingOptions(options);
  const requestUrl = new URL(request.url);

  if (!shouldRoutePathToMarkdownEndpoint(requestUrl.pathname, routing)) {
    return notFound();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const upstreamRequest = new Request(requestUrl.toString(), {
    method: request.method,
    headers: prepareUpstreamHeaders(
      request.headers,
      routing.bypassHeaderName,
      routing.bypassHeaderValue,
      options.upstreamAcceptHeader ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    ),
    redirect: "manual",
  });

  const upstreamResponse = sanitizeUpstreamHeaders(await fetchImpl(upstreamRequest));

  const markdownRequest = new Request(requestUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  if (!shouldServeMarkdownForPath(requestUrl.pathname, routing)) {
    return transformFetchResponse(
      withHtmlOnlyAccept(markdownRequest),
      upstreamResponse,
      toTransformOptions(options),
    );
  }

  return transformFetchResponse(markdownRequest, upstreamResponse, toTransformOptions(options));
}
