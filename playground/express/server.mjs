import express from "express";

import { createExpressMarkdownMiddleware } from "@web-markdown/adapters-express";
import { createDefaultConverter } from "@web-markdown/converters";

const app = express();
const port = Number(process.env.PORT || 3001);

const defaultConverter = createDefaultConverter({
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

app.use(
  createExpressMarkdownMiddleware({
    converter: defaultConverter,
    include: ["/**"],
    exclude: ["/not-markdown", "/strict/**"],
    maxHtmlBytes: 3 * 1024 * 1024,
    oversizeBehavior: "passthrough",
    debugHeaders: true,
    onObservation: (event) => {
      console.log(`[web-markdown:default] ${JSON.stringify(event)}`);
    },
  }),
);

app.use(
  createExpressMarkdownMiddleware({
    converter: createDefaultConverter({
      mode: "verbatim",
      addFrontMatter: false,
    }),
    include: ["/strict/**"],
    maxHtmlBytes: 1024,
    oversizeBehavior: "not-acceptable",
    debugHeaders: true,
    onObservation: (event) => {
      console.log(`[web-markdown:strict] ${JSON.stringify(event)}`);
    },
  }),
);

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <title>Express Playground</title>
    <meta name="description" content="Express markdown negotiation capability matrix" />
  </head>
  <body>
    <main>
      <h1>Express playground</h1>
      <p>This app demonstrates markdown negotiation and fallback behavior.</p>
      <ul>
        <li><a href="/guide">/guide</a> front matter + canonical/base URL handling.</li>
        <li><a href="/seo">/seo</a> OpenGraph/Twitter SEO metadata fallback into front matter.</li>
        <li><a href="/table">/table</a> conversion quality for lists/code/tables/images.</li>
        <li><a href="/hooks">/hooks</a> rewriteLink/rewriteImage hooks.</li>
        <li><a href="/not-markdown">/not-markdown</a> excluded path (always HTML).</li>
        <li><a href="/json">/json</a> non-HTML passthrough.</li>
        <li><a href="/download">/download</a> attachment passthrough.</li>
        <li><a href="/redirect">/redirect</a> redirect passthrough.</li>
        <li><a href="/oversize-passthrough">/oversize-passthrough</a> too-large HTML with passthrough behavior.</li>
        <li><a href="/strict/oversize-406">/strict/oversize-406</a> too-large HTML with 406 behavior.</li>
      </ul>
      <p>Use <code>Accept: text/markdown</code> and inspect <code>Vary</code> and debug headers.</p>
    </main>
  </body>
</html>`);
});

app.get("/guide", (_req, res) => {
  res.set("Cache-Control", "public, max-age=120");
  res.set("ETag", '"guide-manual-etag"');
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <title>Guide</title>
    <meta name="description" content="Guide page for markdown metadata and URL rewriting" />
    <link rel="canonical" href="https://docs.example.test/guide/canonical" />
    <base href="https://docs.example.test/base/" />
  </head>
  <body>
    <nav><a href="/">Home nav</a></nav>
    <main>
      <h1>Guide page</h1>
      <p>Relative links should become absolute markdown links.</p>
      <p><a href="./setup">Setup</a> and <a href="../faq">FAQ</a></p>
      <p><img src="./hero.png" alt="Hero image" /></p>
    </main>
    <footer>Footer is removed in content mode.</footer>
  </body>
</html>`);
});

app.get("/seo", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta property="og:title" content="Express SEO via OpenGraph" />
    <meta property="og:description" content="SEO metadata fallback demo using OpenGraph tags." />
    <meta property="og:url" content="https://docs.example.test/express/seo#overview" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="https://docs.example.test/images/seo-og.png" />
    <meta property="og:image:alt" content="Express SEO preview image" />
    <meta property="og:site_name" content="web-markdown docs" />
    <meta property="article:author" content="https://docs.example.test/authors/web-markdown-team" />
    <meta name="author" content="web-markdown team" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Express SEO via OpenGraph" />
    <meta name="twitter:description" content="Twitter description fallback is also supported." />
    <meta name="twitter:image" content="https://docs.example.test/images/seo-og.png" />
    <meta name="twitter:creator" content="@webmarkdown" />
    <meta name="robots" content="index,follow,max-snippet:-1" />
  </head>
  <body>
    <main>
      <h1>SEO metadata demo</h1>
      <p>
        This page includes rich OpenGraph and Twitter metadata so markdown output can demonstrate
        stable metadata extraction.
      </p>
      <p><a href="/guide">Back to guide</a></p>
    </main>
  </body>
</html>`);
});

app.get("/table", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <title>Conversion Quality</title>
    <meta name="description" content="Lists, code blocks, and tables" />
  </head>
  <body>
    <main>
      <h1>Conversion quality</h1>
      <p>This route stresses common markdown structures.</p>
      <pre><code class="language-ts">const hello = "world";</code></pre>
      <ul>
        <li>First item</li>
        <li>Second item</li>
      </ul>
      <table>
        <thead>
          <tr><th>Feature</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Headings</td><td>Kept</td></tr>
          <tr><td>Tables</td><td>Reasonable markdown output</td></tr>
        </tbody>
      </table>
      <p><img src="/images/sample.png" alt="Sample image" /></p>
    </main>
  </body>
</html>`);
});

app.get("/hooks", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <title>Hook Demo</title>
  </head>
  <body>
    <main>
      <h1>Hook demo</h1>
      <p>Link/image rewrite hooks append query params in markdown output.</p>
      <p><a href="/guide">Guide link</a></p>
      <p><img src="/images/hook.png" alt="Hook image" /></p>
    </main>
  </body>
</html>`);
});

app.get("/not-markdown", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <title>HTML Only</title>
  </head>
  <body>
    <main>
      <h1>HTML Only</h1>
      <p>This path is excluded from markdown transformation.</p>
    </main>
  </body>
</html>`);
});

app.get("/json", (_req, res) => {
  res.json({
    ok: true,
    kind: "json",
    note: "JSON responses are never converted.",
  });
});

app.get("/download", (_req, res) => {
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="report.csv"');
  res.send("id,name\n1,alpha\n2,beta\n");
});

app.get("/redirect", (_req, res) => {
  res.redirect(302, "/guide");
});

app.get("/oversize-passthrough", (_req, res) => {
  const payload = "x".repeat(4 * 1024 * 1024);
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head><title>Oversize passthrough</title></head>
  <body>
    <main>
      <h1>Too large for markdown</h1>
      <p>${payload}</p>
    </main>
  </body>
</html>`);
});

app.get("/strict/oversize-406", (_req, res) => {
  const payload = "y".repeat(4096);
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head><title>Strict oversize</title></head>
  <body>
    <main>
      <h1>Strict mode oversize route</h1>
      <p>${payload}</p>
    </main>
  </body>
</html>`);
});

app.get("/strict/small", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head><title>Strict small</title></head>
  <body>
    <main>
      <h1>Strict small route</h1>
      <p>This route can still transform because it is under the size limit.</p>
    </main>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`Express playground listening on http://localhost:${port}`);
});
