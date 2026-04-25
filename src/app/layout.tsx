import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fin-Tech Assistant (Pro Edition)',
  description: 'Next-generation PWA for personal finance',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-512-v1.png',
    apple: '/icon-512-v1.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
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
