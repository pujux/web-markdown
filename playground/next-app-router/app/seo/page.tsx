export const metadata = {
  title: "Next App Router SEO via OpenGraph",
  description: "SEO metadata fallback demo using OpenGraph tags.",
  authors: [{ name: "web-markdown team" }],
  openGraph: {
    title: "Next App Router SEO via OpenGraph",
    description: "SEO metadata fallback demo using OpenGraph tags.",
    url: "https://docs.example.test/next/seo#summary",
    type: "article",
    images: [
      {
        url: "https://docs.example.test/images/seo-og.png",
        width: 1200,
        height: 630,
        alt: "Next App Router SEO preview image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Next App Router SEO via OpenGraph",
    description: "SEO metadata fallback demo using OpenGraph tags.",
    images: ["https://docs.example.test/images/seo-og.png"],
    creator: "@webmarkdown",
  },
};

export default function SeoPage() {
  return (
    <main>
      <h1>SEO metadata demo</h1>
      <p>
        This route intentionally includes rich OpenGraph and Twitter metadata so markdown output can
        demonstrate stable metadata extraction.
      </p>
      <p>
        <a href="/rich">Back to rich page</a>
      </p>
    </main>
  );
}
