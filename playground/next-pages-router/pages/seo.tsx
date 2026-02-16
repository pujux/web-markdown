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
        <meta property="og:image" content="https://docs.example.test/images/seo-og.png" />
        <meta property="og:image:alt" content="Next Pages Router SEO preview image" />
        <meta property="og:site_name" content="web-markdown docs" />
        <meta
          property="article:author"
          content="https://docs.example.test/authors/web-markdown-team"
        />
        <meta name="author" content="web-markdown team" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Next Pages Router SEO via OpenGraph" />
        <meta
          name="twitter:description"
          content="Twitter description fallback is also supported."
        />
        <meta name="twitter:image" content="https://docs.example.test/images/seo-og.png" />
        <meta name="twitter:creator" content="@webmarkdown" />
        <meta name="robots" content="index,follow,max-snippet:-1" />
      </Head>
      <main>
        <h1>SEO metadata demo</h1>
        <p>
          This route includes rich OpenGraph and Twitter metadata so markdown output can demonstrate
          stable metadata extraction.
        </p>
        <p>
          <a href="/rich">Back to rich page</a>
        </p>
      </main>
    </>
  );
}
