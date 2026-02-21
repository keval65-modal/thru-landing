import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GoogleMapsScript } from "@/components/GoogleMapsScript";
import { GoogleMapsDebug } from "@/components/demo/GoogleMapsDebug";

export const metadata: Metadata = {
  title: 'Thru',
  description: 'Buy and curbside pickup your daily needs on the way.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth overscroll-none">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <GoogleMapsScript />
      </head>
      <body className="font-body antialiased overscroll-none">
        <GoogleMapsDebug />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
