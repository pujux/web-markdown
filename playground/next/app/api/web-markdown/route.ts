import { handleInternalMarkdownRequest } from "@web-markdown/adapters-next";
import { createDefaultConverter } from "@web-markdown/converters";
import type { TransformObservation } from "@web-markdown/transform-fetch";

const routing = {
  include: ["/**"],
  exclude: ["/not-markdown"],
};

const converter = createDefaultConverter({
  mode: "content",
  addFrontMatter: true,
  rewriteLink: (url, ctx) => {
    const pathname = new URL(ctx.requestUrl).pathname;
    if (!pathname.startsWith("/hooks")) {
      return url;
    }

    const rewritten = new URL(url);
    rewritten.searchParams.set("rewritten", "1");
    return rewritten.toString();
  },
  rewriteImage: (url, ctx) => {
    const pathname = new URL(ctx.requestUrl).pathname;
    if (!pathname.startsWith("/hooks")) {
      return url;
    }

    const rewritten = new URL(url);
    rewritten.searchParams.set("img", "1");
    return rewritten.toString();
  },
});

const options = {
  converter,
  ...routing,
  maxHtmlBytes: 3 * 1024 * 1024,
  oversizeBehavior: "passthrough" as const,
  debugHeaders: true,
  onObservation: (event: TransformObservation) => {
    console.log(`[web-markdown:next] ${JSON.stringify(event)}`);
  },
};

async function handler(request: Request): Promise<Response> {
  return handleInternalMarkdownRequest(request, options);
}

export const GET = handler;
export const HEAD = handler;
