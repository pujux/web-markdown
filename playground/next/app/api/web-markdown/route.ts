import { handleInternalMarkdownRequest } from "@web-markdown/adapters-next";
import { createDefaultConverter } from "@web-markdown/converters";

const options = {
  converter: createDefaultConverter({
    mode: "content",
    addFrontMatter: true,
  }),
  debugHeaders: true,
};

async function handler(request: Request): Promise<Response> {
  return handleInternalMarkdownRequest(request, options);
}

export const GET = handler;
export const HEAD = handler;
