import { normalizeRoutingOptions } from "@web-markdown/adapters-next";
import { createDefaultConverter } from "@web-markdown/converters";

export const INTERNAL_MARKER_HEADER = "x-web-markdown-internal";
export const INTERNAL_MARKER_VALUE = "1";

export const routing = normalizeRoutingOptions({
  include: ["/**"],
  exclude: ["/not-markdown"],
});

export const endpointOptions = {
  converter: createDefaultConverter({
    mode: "content",
    addFrontMatter: true,
    rewriteLink: (url: string, ctx) => {
      const pathname = new URL(ctx.requestUrl).pathname;
      if (!pathname.startsWith("/hooks")) {
        return url;
      }

      const rewritten = new URL(url);
      rewritten.searchParams.set("rewritten", "1");
      return rewritten.toString();
    },
    rewriteImage: (url: string, ctx) => {
      const pathname = new URL(ctx.requestUrl).pathname;
      if (!pathname.startsWith("/hooks")) {
        return url;
      }

      const rewritten = new URL(url);
      rewritten.searchParams.set("img", "1");
      return rewritten.toString();
    },
  }),
  include: routing.include,
  exclude: routing.exclude,
  maxHtmlBytes: 3 * 1024 * 1024,
  oversizeBehavior: "passthrough" as const,
  debugHeaders: true,
  onObservation: (event: unknown) => {
    console.log(`[web-markdown:next-pages] ${JSON.stringify(event)}`);
  },
};
