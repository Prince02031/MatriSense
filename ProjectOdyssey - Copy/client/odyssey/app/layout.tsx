import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

import "./globals.css";
import NavBar from "@/components/NavBar";
import GlobalGroupChat from "@/components/GlobalGroupChat";

// Load fonts with CSS variables for easy usage
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Odyssey Travel App",
  description: "Plan your perfect trips with AI-powered itineraries",
  openGraph: {
    title: "Odyssey Travel App",
    description: "Plan your perfect trips with AI-powered itineraries",
    type: "website",
    siteName: "Odyssey Travel",
    images: [
      {
        url: "https://via.placeholder.com/1200x630?text=Odyssey+Travel",
        width: 1200,
        height: 630,
        alt: "Odyssey Travel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Odyssey Travel App",
    description: "Plan your perfect trips with AI-powered itineraries",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Manrope:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} antialiased bg-[#FFF5E9]`}>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker&loading=async`}
          async
          defer
        ></script>
        <NavBar />
        <GlobalGroupChat />
        {children}
      </body>
    </html>
  );
}
