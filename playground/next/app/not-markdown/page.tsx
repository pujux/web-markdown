export const metadata = {
  title: "web-markdown Next Playground HTML-only Page",
  description: "Next adapter demo for markdown content negotiation",
};

export default function NotMarkdownPage() {
  return (
    <main>
      <h1>HTML Only Page</h1>
      <p>This path is excluded from markdown transformation in middleware config.</p>
    </main>
  );
}
