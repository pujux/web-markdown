export default function Page() {
  return (
    <main>
      <h1>Markdown-ready Page</h1>
      <p>
        This page is served as markdown when <code>Accept: text/markdown</code> is requested.
      </p>
      <p>
        <a href="/not-markdown">HTML-only page (excluded from markdown)</a>
      </p>
      <ul>
        <li>Normal HTML still works for browsers.</li>
        <li>Markdown negotiation is explicit by Accept header.</li>
      </ul>
    </main>
  );
}
