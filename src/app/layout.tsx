// src/app/layout.tsx
// Root layout — minimal, global CSS dan font

import type { Metadata } from "next";
import { Bodoni_Moda, Caveat_Brush } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const caveat = Caveat_Brush({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: {
    default: "SkinSync — Skincare Terpercaya",
    template: "%s | SkinSync",
  },
  description:
    "Temukan produk skincare terpercaya dengan formula yang cocok untuk jenis kulitmu.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${bodoni.variable} ${caveat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
