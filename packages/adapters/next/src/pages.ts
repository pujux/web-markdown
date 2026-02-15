import type { GetServerSideProps, GetServerSidePropsContext, NextPage } from 'next';

import {
  handleInternalMarkdownRequest,
  type NextMarkdownEndpointOptions
} from './internal';

interface PagesEndpointFactoryResult {
  MarkdownPage: NextPage;
  getServerSideProps: GetServerSideProps;
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function nodeHeadersToFetchHeaders(headers: Record<string, string | string[] | undefined>): Headers {
  const out = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        out.append(name, item);
      }

      continue;
    }

    out.set(name, value);
  }

  return out;
}

function getRequestUrl(context: GetServerSidePropsContext): string {
  const forwardedProto = getHeaderValue(context.req.headers['x-forwarded-proto']);
  const forwardedHost = getHeaderValue(context.req.headers['x-forwarded-host']);
  const host = forwardedHost ?? context.req.headers.host ?? 'localhost:3000';
  const protocol = forwardedProto ?? 'http';
  const pathname = context.resolvedUrl ?? context.req.url ?? '/';

  return new URL(pathname, `${protocol}://${host}`).toString();
}

function applyResponseHeaders(res: GetServerSidePropsContext['res'], headers: Headers): void {
  const setCookies = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();

  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === 'set-cookie') {
      continue;
    }

    res.setHeader(name, value);
  }

  if (setCookies && setCookies.length > 0) {
    res.setHeader('set-cookie', setCookies);
  }
}

export function createPagesMarkdownEndpoint(
  options: NextMarkdownEndpointOptions
): PagesEndpointFactoryResult {
  const MarkdownPage: NextPage = () => null;

  const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
    const request = new Request(getRequestUrl(context), {
      method: context.req.method ?? 'GET',
      headers: nodeHeadersToFetchHeaders(context.req.headers)
    });

    const response = await handleInternalMarkdownRequest(request, options);

    context.res.statusCode = response.status;
    applyResponseHeaders(context.res, response.headers);

    if (!context.res.writableEnded) {
      const body = Buffer.from(await response.arrayBuffer());
      context.res.end(body);
    }

    return {
      props: {}
    };
  };

  return {
    MarkdownPage,
    getServerSideProps
  };
}
