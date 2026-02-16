import Head from "next/head";

export default function HooksPage() {
  return (
    <>
      <Head>
        <title>web-markdown Next Pages Router Hook Demo</title>
        <meta name="description" content="rewriteLink and rewriteImage hook demonstration." />
      </Head>
      <main>
        <h1>Hook demo</h1>
        <p>When requested as markdown, link/image URLs are rewritten by converter hooks.</p>
        <p>
          <a href="/rich">Open rich page</a>
        </p>
        <p>
          <img src="/images/hook.png" alt="Hook demo image" />
        </p>
        <p>
          <a href="/">Back to home</a>
        </p>
      </main>
    </>
  );
}
