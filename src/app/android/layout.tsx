import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Motivationsboost für Android',
  robots: { index: false, follow: false },
  manifest: '/android/manifest.webmanifest',
  icons: { icon: '/android/icon-192.png' },
};

export default function AndroidLayout({ children }: { children: ReactNode }) {
  return children;
}
