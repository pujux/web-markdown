import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultConverter } from '@web-markdown/converters';

import { createExpressMarkdownMiddleware } from '../src';

function createApp(overrides?: Partial<Parameters<typeof createExpressMarkdownMiddleware>[0]>) {
  const app = express();
  const onObservation = overrides?.onObservation ?? vi.fn();

  app.use(
    createExpressMarkdownMiddleware({
      converter: createDefaultConverter({
        mode: 'content',
        addFrontMatter: false
      }),
      debugHeaders: true,
      onObservation,
      ...overrides
    })
  );

  app.get('/html', (_req, res) => {
    res.status(200);
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.setHeader('ETag', '"example-etag"');
    res.setHeader('Vary', 'Accept-Encoding');
    res.type('html').send(
      '<!doctype html><html lang="en"><head><title>Hello</title></head><body><main><h1>Hello</h1><p>World</p></main></body></html>'
    );
  });

  app.get('/json', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/redirect', (_req, res) => {
    res.redirect(302, '/html');
  });

  app.get('/large', (_req, res) => {
    const repeated = 'x'.repeat(128);
    res.type('html').send(`<html><body><main><p>${repeated}</p></main></body></html>`);
  });

  app.get('/stream', (_req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write('<html><body><main><h1>Streamed</h1>');
    res.end('<p>Body</p></main></body></html>');
  });

  app.get('/not-markdown', (_req, res) => {
    res.type('html').send('<!doctype html><html><body><main><h1>No Markdown</h1></main></body></html>');
  });

  return { app, onObservation };
}

describe('createExpressMarkdownMiddleware', () => {
  it('transforms eligible html responses', async () => {
    const { app } = createApp();

    const res = await request(app).get('/html').set('Accept', 'text/markdown, text/html;q=0.9');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['x-markdown-transformed']).toBe('1');
    expect(res.headers['x-markdown-converter']).toBe('0.1.0');
    expect(res.headers.vary).toContain('Accept-Encoding');
    expect(res.headers.vary).toContain('Accept');
    expect(res.headers['cache-control']).toBe('public, max-age=120');
    expect(res.headers.etag).toBeUndefined();
    expect(res.text).toContain('# Hello');
    expect(res.text).toContain('World');
  });

  it('passes through html when markdown is not explicitly acceptable', async () => {
    const { app } = createApp();

    const res = await request(app).get('/html').set('Accept', 'text/html,*/*');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['x-markdown-transformed']).toBe('0');
    expect(res.headers.vary).toContain('Accept');
    expect(res.headers.etag).toBe('"example-etag"');
    expect(res.text).toContain('<h1>Hello</h1>');
  });

  it('passes through non-html responses', async () => {
    const { app } = createApp();

    const res = await request(app).get('/json').set('Accept', 'text/markdown');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-markdown-transformed']).toBe('0');
    expect(res.body).toEqual({ ok: true });
  });

  it('skips redirects', async () => {
    const { app } = createApp();

    const res = await request(app).get('/redirect').set('Accept', 'text/markdown').redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/html');
    expect(res.headers['x-markdown-transformed']).toBe('0');
  });

  it('supports oversize 406 behavior', async () => {
    const { app } = createApp({
      maxHtmlBytes: 32,
      oversizeBehavior: 'not-acceptable'
    });

    const res = await request(app).get('/large').set('Accept', 'text/markdown');

    expect(res.status).toBe(406);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('Not Acceptable');
  });

  it('falls back to passthrough when response is streamed', async () => {
    const { app } = createApp();

    const res = await request(app).get('/stream').set('Accept', 'text/markdown');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['x-markdown-transformed']).toBeUndefined();
    expect(res.text).toContain('Streamed');
  });

  it('emits observations through options hook', async () => {
    const observationHook = vi.fn();
    const { app } = createApp({ onObservation: observationHook });

    await request(app).get('/html').set('Accept', 'text/markdown');

    expect(observationHook).toHaveBeenCalledTimes(1);
    const firstCall = observationHook.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toMatchObject({
      transformed: true,
      status: 200
    });
  });

  it('respects include and exclude route filters', async () => {
    const { app } = createApp({
      include: ['/html', '/not-markdown'],
      exclude: ['/not-markdown']
    });

    const included = await request(app).get('/html').set('Accept', 'text/markdown');
    expect(included.status).toBe(200);
    expect(included.headers['content-type']).toContain('text/markdown');
    expect(included.headers['x-markdown-transformed']).toBe('1');

    const excluded = await request(app).get('/not-markdown').set('Accept', 'text/markdown');
    expect(excluded.status).toBe(200);
    expect(excluded.headers['content-type']).toContain('text/html');
    expect(excluded.headers.vary).toContain('Accept');
    expect(excluded.headers['x-markdown-transformed']).toBe('0');
    expect(excluded.text).toContain('<h1>No Markdown</h1>');

    const notIncluded = await request(app).get('/large').set('Accept', 'text/markdown');
    expect(notIncluded.status).toBe(200);
    expect(notIncluded.headers['content-type']).toContain('text/html');
    expect(notIncluded.headers.vary).toContain('Accept');
    expect(notIncluded.headers['x-markdown-transformed']).toBe('0');
    expect(notIncluded.text).toContain('<p>');
  });
});
