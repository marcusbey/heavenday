import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Heaven Dolls - Premium Adult Products Marketplace",
  description: "Discover premium adult products with sophisticated taste. Elegant, discreet, and tastefully curated for discerning customers.",
  keywords: "adult products, premium marketplace, discreet shopping, adult toys, intimate products",
  robots: "index, follow",
  openGraph: {
    title: "Heaven Dolls - Premium Adult Products Marketplace",
    description: "Discover premium adult products with sophisticated taste.",
    type: "website",
    siteName: "Heaven Dolls",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heaven Dolls - Premium Adult Products Marketplace",
    description: "Discover premium adult products with sophisticated taste.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}