import Head from "next/head";

export default function RichPage() {
  return (
    <>
      <Head>
        <title>web-markdown Next Pages Router Rich Demo</title>
        <meta name="description" content="Conversion quality demo for markdown output." />
        <link rel="canonical" href="https://docs.example.test/next-pages/rich" />
      </Head>
      <main>
        <h1>Rich content page</h1>
        <p>This route demonstrates headings, code blocks, lists, tables, and media conversion.</p>
        <pre>
          <code>{`const message = "hello";\nconsole.log(message);`}</code>
        </pre>
        <ul>
          <li>List item one</li>
          <li>List item two</li>
        </ul>
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Expected output</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Table handling</td>
              <td>Reasonable markdown table</td>
            </tr>
            <tr>
              <td>Image handling</td>
              <td>Alt text preserved</td>
            </tr>
          </tbody>
        </table>
        <p>
          <img src="/images/rich.png" alt="Rich page hero" />
        </p>
        <p>
          <a href="/">Back to home</a>
        </p>
      </main>
    </>
  );
}
