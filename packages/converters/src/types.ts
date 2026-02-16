import type { MarkdownTransformContext } from "@web-markdown/core";

export type ConverterMode = "verbatim" | "content";

export interface UrlRewriteContext {
  kind: "link" | "image";
  requestUrl: string;
  responseUrl?: string;
  baseUrl?: string;
  canonicalUrl?: string;
  elementTag: string;
}

export interface DefaultConverterOptions {
  mode?: ConverterMode;
  addFrontMatter?: boolean;
  stripSelectors?: string[];
  contentMinTextLength?: number;
  rewriteLink?: (url: string, ctx: UrlRewriteContext) => string;
  rewriteImage?: (url: string, ctx: UrlRewriteContext) => string;
  defaultStripSelectors?: string[];
  frontMatterFields?: Array<"title" | "url" | "lang" | "description" | "canonical">;
  markdownOptions?: Record<string, unknown>;
}

export interface ConversionMetadata {
  title?: string;
  url?: string;
  lang?: string;
  description?: string;
  canonical?: string;
}

export interface PreparedDocument {
  markdownHtml: string;
  metadata: ConversionMetadata;
  baseUrl?: string;
  canonicalUrl?: string;
}

export interface ConverterRuntimeContext {
  options: Required<
    Pick<
      DefaultConverterOptions,
      "mode" | "addFrontMatter" | "stripSelectors" | "frontMatterFields"
    >
  > &
    Omit<
      DefaultConverterOptions,
      "mode" | "addFrontMatter" | "stripSelectors" | "frontMatterFields"
    >;
  context: MarkdownTransformContext;
}
