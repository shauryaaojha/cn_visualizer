import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, JetBrains_Mono, Kalam } from "next/font/google";
import { BlockTransition } from "@/components/layout/BlockTransition";
import "./globals.css";

// Kalam is the teacher's hand; JetBrains Mono is the network's. Nothing on a
// screen should be ambiguous about which of the two is speaking.
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

// Atkinson Hyperlegible is the reading voice — prose, labels, buttons. Kalam
// is lovely at headline size and exhausting at 13px, so it no longer carries
// paragraphs. Atkinson was drawn for low-vision legibility, which is exactly
// what a compressed screen recording needs.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-atkinson",
  display: "swap",
  // next/font has no metric overrides for this family yet; without this it
  // warns on every compile.
  adjustFontFallback: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CN_Visualizer — Computer Networks, Animated",
  description:
    "An interactive, fully-animated Computer Networks visualizer. Every process moves, every algorithm steps, every network can be broken.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Every font is self-hosted: next/font vendors Kalam, Atkinson and JetBrains Mono at
    // build time, and icons are Phosphor SVGs bundled into the JS.
    // The app makes no network requests at runtime — it works with wifi off.
    <html lang="en" className="dark">
      <body
        className={`${kalam.variable} ${atkinson.variable} ${jetbrainsMono.variable} font-body-md text-body-md text-on-background antialiased`}
      >
        {children}
        <BlockTransition />
      </body>
    </html>
  );
}
