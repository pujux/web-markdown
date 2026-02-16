import Head from "next/head";

export default function NotMarkdownPage() {
  return (
    <>
      <Head>
        <title>web-markdown Next Pages Router HTML-only Page</title>
        <meta name="description" content="Pages Router demo for markdown content negotiation" />
      </Head>
      <main>
        <h1>HTML-only page</h1>
        <p>This path is excluded from markdown transformation in route options.</p>
        <p>
          <a href="/">Back to home</a>
        </p>
      </main>
    </>
  );
}
