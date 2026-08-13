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
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${kalam.variable} ${jetbrainsMono.variable} font-body-md text-body-md text-on-background antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
