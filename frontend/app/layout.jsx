import './globals.css';
import { AuthProvider } from './context/AuthContext';

export const metadata = {
  title: 'MatriSense — Maternal Health Assistant',
  description: 'AI-powered maternal health triage system for rural Bangladesh',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
