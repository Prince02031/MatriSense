import './globals.css';

export const metadata = {
  title: 'MatriSense',
  description: 'React and Next.js frontend for MatriSense',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
