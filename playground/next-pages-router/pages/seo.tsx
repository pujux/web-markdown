import Head from "next/head";

export default function SeoPage() {
  return (
    <>
      <Head>
        <meta property="og:title" content="Next Pages Router SEO via OpenGraph" />
        <meta
          property="og:description"
          content="SEO metadata fallback demo using OpenGraph tags."
        />
        <meta property="og:url" content="https://docs.example.test/next-pages/seo#summary" />
        <meta property="og:type" content="article" />
        <meta
          name="twitter:description"
          content="Twitter description fallback is also supported."
        />
        <meta name="robots" content="index,follow,max-snippet:-1" />
      </Head>
      <main>
        <h1>SEO metadata demo</h1>
        <p>
          This route intentionally omits title/canonical/description standard tags so markdown front
          matter is populated from OpenGraph and Twitter metadata.
        </p>
        <p>
          <a href="/rich">Back to rich page</a>
        </p>
      </main>
    </>
  );
}
