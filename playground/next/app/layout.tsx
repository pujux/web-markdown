import type { ReactNode } from 'react';

export const metadata = {
  title: 'web-markdown Next Playground',
  description: 'Next adapter demo for markdown content negotiation'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
