import type { Metadata } from 'next';

// Run 59 — a QR-only utility page, not a marketing surface, so it stays out
// of search results (same treatment the login and portal routes get).
export const metadata: Metadata = {
  title: 'Ask a Question — Grace Life Center',
  robots: { index: false, follow: false },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
