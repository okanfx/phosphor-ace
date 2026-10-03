import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHOSPHOR ACE — OKANFXLABS AI Design Labs",
  description:
    "A dot-matrix arcade air-war. Six sectors, two capital ships, one glowing panel. Built by OKANFXLABS AI Design Labs.",
  applicationName: "Phosphor Ace",
  authors: [{ name: "OKANFXLABS AI Design Labs" }],
  creator: "OKANFXLABS AI Design Labs",
  keywords: [
    "arcade", "shmup", "shoot em up", "dot matrix", "canvas game",
    "OKANFXLABS", "retro", "bullet hell",
  ],
  openGraph: {
    title: "PHOSPHOR ACE",
    description:
      "A dot-matrix arcade air-war rendered entirely in glowing dots. OKANFXLABS AI Design Labs.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#03060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}