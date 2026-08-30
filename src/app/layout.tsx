import type { Metadata } from "next";
import { Newsreader, JetBrains_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Placeholder fonts so the site looks finished out of the box. Swap these
// for your own paid fonts by following public/fonts/README.md — you'll
// replace the CSS variables below with @font-face declarations, nothing
// else in the codebase needs to change.
const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display-fallback",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const label = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-label-fallback",
  weight: ["400", "500"],
  fallback: ["SF Mono", "Consolas", "monospace"],
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body-fallback",
  weight: ["400", "500", "600"],
  fallback: ["-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Cabinet — one curiosity a day",
  description:
    "A fresh, niche topic pulled from an infinite drawer every day, with real sources to start your research.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${label.variable} ${body.variable}`}
        // Some browser extensions inject attributes (e.g. bis_skin_checked)
        // into <body> before React hydrates, which otherwise triggers a
        // false-positive hydration mismatch warning that has nothing to do
        // with this app's rendering.
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
