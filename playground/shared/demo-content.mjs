const OVERSIZE_PASSTHROUGH_PAYLOAD = "x".repeat(4 * 1024 * 1024);
const STRICT_OVERSIZE_PAYLOAD = "y".repeat(4096);

export const DEMO_ROUTE_PATHS = [
  "/",
  "/guide",
  "/seo",
  "/table",
  "/hooks",
  "/not-markdown",
  "/json",
  "/download",
  "/redirect",
  "/oversize-passthrough",
  "/strict/oversize-406",
  "/strict/small",
];

function htmlResponse(body, headers = {}) {
  return {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
    body,
  };
}

function textResponse(status, body, headers = {}) {
  return {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...headers,
    },
    body,
  };
}

function jsonResponse(value) {
  return {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(value),
  };
}

function csvAttachmentResponse(body, filename) {
  return {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
    body,
  };
}

function redirectResponse(location) {
  return textResponse(302, "Found", {
    location,
  });
}

export function getDemoRouteResponse(pathname, frameworkName) {
  switch (pathname) {
    case "/":
      return htmlResponse(`<!doctype html>
<html lang="en">
  <head>
    <title>${frameworkName} Playground</title>
    <meta name="description" content="${frameworkName} markdown negotiation capability matrix" />
  </head>
  <body>
    <main>
      <h1>${frameworkName} playground</h1>
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

    case "/guide":
      return htmlResponse(
        `<!doctype html>
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
</html>`,
        {
          "cache-control": "public, max-age=120",
          etag: '"guide-manual-etag"',
        },
      );

    case "/seo":
      return htmlResponse(`<!doctype html>
<html lang="en">
  <head>
    <meta property="og:title" content="${frameworkName} SEO via OpenGraph" />
    <meta property="og:description" content="SEO metadata fallback demo using OpenGraph tags." />
    <meta property="og:url" content="https://docs.example.test/${frameworkName.toLowerCase().replaceAll(" ", "-")}/seo#overview" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="https://docs.example.test/images/seo-og.png" />
    <meta property="og:image:alt" content="${frameworkName} SEO preview image" />
    <meta property="og:site_name" content="web-markdown docs" />
    <meta property="article:author" content="https://docs.example.test/authors/web-markdown-team" />
    <meta name="author" content="web-markdown team" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${frameworkName} SEO via OpenGraph" />
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

    case "/table":
      return htmlResponse(`<!doctype html>
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

    case "/hooks":
      return htmlResponse(`<!doctype html>
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

    case "/not-markdown":
      return htmlResponse(`<!doctype html>
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

    case "/json":
      return jsonResponse({
        ok: true,
        kind: "json",
        note: "JSON responses are never converted.",
      });

    case "/download":
      return csvAttachmentResponse("id,name\n1,alpha\n2,beta\n", "report.csv");

    case "/redirect":
      return redirectResponse("/guide");

    case "/oversize-passthrough":
      return htmlResponse(`<!doctype html>
<html lang="en">
  <head><title>Oversize passthrough</title></head>
  <body>
    <main>
      <h1>Too large for markdown</h1>
      <p>${OVERSIZE_PASSTHROUGH_PAYLOAD}</p>
    </main>
  </body>
</html>`);

    case "/strict/oversize-406":
      return htmlResponse(`<!doctype html>
<html lang="en">
  <head><title>Strict oversize</title></head>
  <body>
    <main>
      <h1>Strict mode oversize route</h1>
      <p>${STRICT_OVERSIZE_PAYLOAD}</p>
    </main>
  </body>
</html>`);

    case "/strict/small":
      return htmlResponse(`<!doctype html>
<html lang="en">
  <head><title>Strict small</title></head>
  <body>
    <main>
      <h1>Strict small route</h1>
      <p>This route can still transform because it is under the size limit.</p>
    </main>
  </body>
</html>`);

    default:
      return undefined;
  }
}
