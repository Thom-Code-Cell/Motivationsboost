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
      <body className="font-sans antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
