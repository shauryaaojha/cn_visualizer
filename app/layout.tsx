import type { Metadata } from "next";
import { JetBrains_Mono, Kalam } from "next/font/google";
import "./globals.css";

// Kalam is the teacher's hand; JetBrains Mono is the network's. Nothing on a
// screen should be ambiguous about which of the two is speaking.
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
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
    // Every font is self-hosted: next/font vendors Kalam and JetBrains Mono at
    // build time, and Material Symbols is a local subset (see globals.css).
    // The app makes no network requests at runtime — it works with wifi off.
    <html lang="en" className="dark">
      <body
        className={`${kalam.variable} ${jetbrainsMono.variable} font-body-md text-body-md text-on-background antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
