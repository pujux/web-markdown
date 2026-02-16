export const metadata = {
  title: "web-markdown Next Playground HTML-only Page",
  description: "Next adapter demo for markdown content negotiation",
};

export default function NotMarkdownPage() {
  return (
    <main>
      <h1>HTML-only page</h1>
      <p>This path is excluded from markdown transformation in route options.</p>
      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
