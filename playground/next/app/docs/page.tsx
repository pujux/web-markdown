export default function DocsPage() {
  return (
    <main>
      <h1>Markdown-ready Docs Page</h1>
      <p>
        This page is served as markdown when <code>Accept: text/markdown</code> is requested.
      </p>
      <p>
        <a href="/docs/private">Private docs (excluded from markdown)</a>
      </p>
      <ul>
        <li>Normal HTML still works for browsers.</li>
        <li>Markdown negotiation is explicit by Accept header.</li>
      </ul>
    </main>
  );
}
