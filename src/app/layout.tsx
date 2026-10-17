import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./auth.css";
import "./portal.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://northline.co.za",
  ),
  title: {
    default: "Northline | A clearer view of your capital",
    template: "%s | Northline",
  },
  description:
    "Professional trading, transparent reporting and a direct line of sight to your capital. A more considered way forward.",
  openGraph: {
    type: "website",
    siteName: "Northline",
    title: "Northline | A clearer view of your capital",
    description: "Professional trading with a clearer perspective.",
    images: [
      {
        url: "/images/hero-city.jpg",
        width: 1600,
        height: 900,
        alt: "Cape Town at dusk",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15121F",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
