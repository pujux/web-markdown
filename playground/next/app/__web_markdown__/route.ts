import { createAppMarkdownEndpoint } from '@web-markdown/adapters-next/app';
import { createDefaultConverter } from '@web-markdown/converters';

const handler = createAppMarkdownEndpoint({
  converter: createDefaultConverter({
    mode: 'content',
    addFrontMatter: true
  }),
  include: ['/docs/**'],
  exclude: ['/docs/private'],
  debugHeaders: true
});

export const GET = handler;
export const HEAD = handler;
