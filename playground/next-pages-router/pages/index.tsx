export default function HomePage() {
  return (
    <main>
      <h1>Next Pages Router playground</h1>
      <p>
        This project demonstrates manual Pages Router integration for markdown negotiation with
        middleware + an internal API bridge.
      </p>
      <ul>
        <li>
          <a href="/rich">/rich</a> conversion quality + front matter metadata.
        </li>
        <li>
          <a href="/seo">/seo</a> OpenGraph/Twitter SEO metadata fallback into front matter.
        </li>
        <li>
          <a href="/hooks">/hooks</a> rewriteLink/rewriteImage hook demo.
        </li>
        <li>
          <a href="/not-markdown">/not-markdown</a> excluded from markdown transformation.
        </li>
        <li>
          <a href="/file">/file</a> non-HTML response passthrough.
        </li>
        <li>
          <a href="/jump">/jump</a> redirect passthrough.
        </li>
        <li>
          <a href="/api/health">/api/health</a> API route excluded by default.
        </li>
      </ul>
      <p>
        Use <code>Accept: text/markdown</code> and inspect <code>Vary</code> plus markdown debug
        headers.
      </p>
    </main>
  );
}
