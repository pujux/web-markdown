import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@web-markdown/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@web-markdown/converters': fileURLToPath(
        new URL('./packages/converters/src/index.ts', import.meta.url)
      ),
      '@web-markdown/transform-fetch': fileURLToPath(
        new URL('./packages/transform-fetch/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['packages/**/test/**/*.test.ts'],
    environment: 'node'
  }
});
