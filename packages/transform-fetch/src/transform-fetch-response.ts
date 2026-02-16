import {
  acceptsMarkdown,
  type MarkdownTransformContext,
  isHtmlContentType,
  isLikelyHtmlDocument,
  isRedirectStatus,
  mergeVary,
} from "@web-markdown/core";

import { readBodyTextWithLimit } from "./body";
import type {
  TransformFallbackReason,
  TransformFetchResponseOptions,
  TransformObservation,
} from "./types";

const DEFAULT_MAX_HTML_BYTES = 3 * 1024 * 1024;

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function cloneWithHeaders(response: Response, headers: Headers): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function finalizeObservation(
  options: TransformFetchResponseOptions,
  startedAt: number,
  status: number,
  transformed: boolean,
  reason: TransformFallbackReason | undefined,
  htmlBytes: number,
  markdownBytes: number,
): void {
  const observation: TransformObservation = {
    transformed,
    durationMs: Math.max(0, nowMs() - startedAt),
    htmlBytes,
    markdownBytes,
    status,
  };

  if (reason) {
    observation.reason = reason;
  }

  options.onObservation?.(observation);
}

function withDebugHeaders(
  headers: Headers,
  options: TransformFetchResponseOptions,
  transformed: boolean,
): void {
  if (!options.debugHeaders) {
    return;
  }

  headers.set("X-Markdown-Transformed", transformed ? "1" : "0");

  if (transformed) {
    headers.set("X-Markdown-Converter", options.converter.version ?? "unknown");
  }
}

function passthrough(
  response: Response,
  headers: Headers,
  options: TransformFetchResponseOptions,
  startedAt: number,
  reason: TransformFallbackReason,
  htmlBytes = 0,
): Response {
  withDebugHeaders(headers, options, false);
  finalizeObservation(options, startedAt, response.status, false, reason, htmlBytes, 0);
  return cloneWithHeaders(response, headers);
}

export async function transformFetchResponse(
  request: Request,
  response: Response,
  options: TransformFetchResponseOptions,
): Promise<Response> {
  const startedAt = nowMs();
  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  const oversizeBehavior = options.oversizeBehavior ?? "passthrough";

  const passthroughHeaders = new Headers(response.headers);
  passthroughHeaders.set("Vary", mergeVary(passthroughHeaders.get("Vary"), "Accept"));

  if (!acceptsMarkdown(request.headers)) {
    return passthrough(response, passthroughHeaders, options, startedAt, "not-acceptable");
  }

  if (response.bodyUsed) {
    return passthrough(response, passthroughHeaders, options, startedAt, "streamed-unsupported");
  }

  if (isRedirectStatus(response.status)) {
    return passthrough(response, passthroughHeaders, options, startedAt, "status");
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !isHtmlContentType(contentType)) {
    return passthrough(response, passthroughHeaders, options, startedAt, "not-html");
  }

  if (!response.body) {
    return passthrough(response, passthroughHeaders, options, startedAt, "no-body");
  }

  const bodyResult = await readBodyTextWithLimit(response.clone(), maxHtmlBytes);

  if (bodyResult.overflow) {
    if (oversizeBehavior === "not-acceptable") {
      const headers = new Headers(passthroughHeaders);
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.delete("Content-Length");
      withDebugHeaders(headers, options, false);
      finalizeObservation(options, startedAt, 406, false, "too-large", bodyResult.bytes, 0);
      return new Response("Not Acceptable: HTML exceeds maxHtmlBytes", {
        status: 406,
        headers,
      });
    }

    return passthrough(
      response,
      passthroughHeaders,
      options,
      startedAt,
      "too-large",
      bodyResult.bytes,
    );
  }

  const htmlText = bodyResult.text;
  const htmlBytes = bodyResult.bytes;
  const responseIsHtml = contentType
    ? isHtmlContentType(contentType)
    : isLikelyHtmlDocument(htmlText);

  if (!responseIsHtml) {
    return passthrough(response, passthroughHeaders, options, startedAt, "not-html", htmlBytes);
  }

  try {
    const context: MarkdownTransformContext = {
      requestUrl: request.url,
      requestHeaders: request.headers,
      responseHeaders: response.headers,
    };

    if (response.url) {
      context.responseUrl = response.url;
    }

    const markdown = await options.converter.convert(htmlText, context);

    const headers = new Headers(passthroughHeaders);
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.delete("Content-Length");
    headers.delete("Content-Encoding");
    headers.delete("ETag");

    withDebugHeaders(headers, options, true);

    const markdownBytes = new TextEncoder().encode(markdown).byteLength;
    finalizeObservation(
      options,
      startedAt,
      response.status,
      true,
      undefined,
      htmlBytes,
      markdownBytes,
    );

    return new Response(markdown, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return passthrough(
      response,
      passthroughHeaders,
      options,
      startedAt,
      "converter-error",
      htmlBytes,
    );
  }
}
