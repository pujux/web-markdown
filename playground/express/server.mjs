import express from 'express';

import { createExpressMarkdownMiddleware } from '@web-markdown/adapters-express';
import { createDefaultConverter } from '@web-markdown/converters';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(
  createExpressMarkdownMiddleware({
    converter: createDefaultConverter({
      mode: 'content',
      addFrontMatter: true
    }),
    debugHeaders: true
  })
);

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <title>Express Playground</title>
    <meta name="description" content="Express markdown negotiation demo" />
  </head>
  <body>
    <nav><a href="/">Home</a></nav>
    <main>
      <h1>Express demo</h1>
      <p>This page is transformed when the request accepts text/markdown.</p>
      <p><a href="/guide">Open guide</a></p>
    </main>
    <footer>Footer should be stripped in content mode.</footer>
  </body>
</html>`);
});

app.get('/guide', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <title>Guide</title>
  </head>
  <body>
    <main>
      <h1>Guide</h1>
      <ul>
        <li>Use <code>Accept: text/markdown</code>.</li>
        <li>Inspect <code>Vary: Accept</code>.</li>
      </ul>
    </main>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`Express playground listening on http://localhost:${port}`);
});
