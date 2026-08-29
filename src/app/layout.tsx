import type { Metadata } from "next";
import { Playfair_Display, Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";

// Placeholder fonts so the site looks finished out of the box. Swap these
// for your own paid fonts by following public/fonts/README.md — you'll
// replace the CSS variables below with @font-face declarations, nothing
// else in the codebase needs to change.
const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display-fallback",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const label = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-label-fallback",
  weight: ["400", "500", "600"],
  fallback: ["Segoe UI", "sans-serif"],
});

const body = Manrope({
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
