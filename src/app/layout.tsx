import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { isLocalMode } from '@/lib/local-mode';

export const metadata: Metadata = {
  title: 'Motivationsboost | KI-Bewerbungsplattform',
  description: 'Ihr intelligenter Bewerbungs-Copilot. Erstellen Sie herausragende Bewerbungsunterlagen, optimieren Sie Ihren Lebenslauf für ATS-Systeme, generieren Sie professionelle KI-Bewerbungsfotos und bereiten Sie sich perfekt auf Interviews vor.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <head>
        {!isLocalMode() && <><link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" /></>}
      </head>
      <body className="font-sans antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
