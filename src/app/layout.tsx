import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Motivationsboost | KI-Bewerbungsplattform',
  robots: { index: false, follow: false },
  description: 'KI-Karrierebegleiter in Entwicklung: Kompetenzen prüfen, Bewerbungsunterlagen individuell gestalten und Interviews vorbereiten. Entwicklung im Umfeld von TH Analytica.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
