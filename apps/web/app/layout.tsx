import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'AALTA - Arizona Assisted Living Transparency Authority',
    template: '%s | AALTA',
  },
  description:
    'Independent compliance intelligence platform providing transparency into Arizona assisted living facilities through public regulatory data.',
  keywords: [
    'Arizona',
    'assisted living',
    'transparency',
    'compliance',
    'senior care',
    'nursing home',
    'inspection reports',
  ],
  authors: [{ name: 'AALTA' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aalta.org',
    siteName: 'AALTA',
    title: 'AALTA - Arizona Assisted Living Transparency Authority',
    description:
      'Independent compliance intelligence platform providing transparency into Arizona assisted living facilities.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AALTA - Arizona Assisted Living Transparency Authority',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AALTA - Arizona Assisted Living Transparency Authority',
    description:
      'Independent compliance intelligence platform providing transparency into Arizona assisted living facilities.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
