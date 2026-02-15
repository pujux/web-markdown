import { withNextMarkdownRouteHandler } from '@web-markdown/adapters-next';
import { createDefaultConverter } from '@web-markdown/converters';

const htmlHandler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <title>Next Demo</title>
    <meta name="description" content="Next markdown negotiation demo" />
    <link rel="canonical" href="${url.origin}/api/content" />
  </head>
  <body>
    <nav><a href="/">Home</a></nav>
    <main>
      <h1>Next Route Handler Demo</h1>
      <p>This payload is transformed only for markdown-aware clients.</p>
      <p><a href="/docs">Relative link</a></p>
    </main>
    <footer>Footer content</footer>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
};

export const GET = withNextMarkdownRouteHandler(htmlHandler, {
  converter: createDefaultConverter({
    mode: 'content',
    addFrontMatter: true
  }),
  debugHeaders: true
});
