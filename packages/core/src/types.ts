export type HeaderRecord = Record<string, string | readonly string[] | undefined>;

export interface MarkdownTransformContext {
  requestUrl: string;
  requestHeaders?: Headers;
  responseHeaders?: Headers;
  responseUrl?: string;
}

export interface HtmlToMarkdownConverter {
  readonly name?: string;
  readonly version?: string;
  convert(html: string, ctx: MarkdownTransformContext): Promise<string> | string;
}
