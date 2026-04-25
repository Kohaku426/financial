import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fin-Tech Assistant (Pro Edition)',
  description: 'Next-generation PWA for personal finance',
  themeColor: '#0a0a0f',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
