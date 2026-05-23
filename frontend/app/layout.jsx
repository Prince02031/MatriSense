import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Script from 'next/script';

export const metadata = {
  title: 'MatriSense — Maternal Health Assistant',
  description: 'AI-powered maternal health triage system for rural Bangladesh',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script 
          src="https://js.puter.com/v2/"
          strategy="afterInteractive"
        />
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
