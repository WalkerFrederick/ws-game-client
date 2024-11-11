import { Metadata } from 'next';
import * as React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';

import UnderlineLink from '@/components/links/UnderlineLink';
import TailwindHeader from '@/components/navigation/TailwindHeader';

import { siteConfig } from '@/constant/config';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-16x16.png',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: `/favicon/site.webmanifest`,
  openGraph: {
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.title,
    images: [`${siteConfig.url}/images/og.jpg`],
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className='h-full'>
      <body className='bg-neutral-700 text-white h-full relative'>
        <TailwindHeader />
        {children}
        <footer className='flex justify-center py-2 bg-neutral-800 absolute bottom-0 text-white border-white w-full'>
          © {new Date().getFullYear()}{' '}
          <UnderlineLink className='pl-1' href='#'>
            Allison F.
          </UnderlineLink>
        </footer>
      </body>
    </html>
  );
}
