import { createNextMarkdownMiddleware } from '@web-markdown/adapters-next/middleware';

export default createNextMarkdownMiddleware({
  include: ['/docs/**'],
  exclude: ['/docs/private']
});
