import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meridian-capital.example.com"),
  title: {
    default: "Meridian Capital Partners — Managed trading, transparently reported",
    template: "%s · Meridian Capital Partners",
  },
  description:
    "Meridian Capital Partners trades on behalf of its clients. Professional traders, a live client portal, and transparent reporting on every position.",
  openGraph: {
    type: "website",
    siteName: "Meridian Capital Partners",
    title: "Meridian Capital Partners — Managed trading, transparently reported",
    description:
      "Professional traders managing client capital, with a live portal showing balance, activity and trader performance.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
