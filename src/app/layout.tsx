import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Church Guest Follow-Up',
  description: 'Guest intake, follow-up tracking, and volunteer management for churches',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
