import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const display = localFont({
  src: "../../public/fonts/fraunces-latin-variable.woff2",
  weight: "100 900",
  variable: "--font-display-source",
  display: "swap",
});

const sans = localFont({
  src: "../../public/fonts/manrope-latin-variable.woff2",
  weight: "200 800",
  variable: "--font-sans-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adaptive Resume — a resume for this job",
  description:
    "Shape a resume around the job you want, using the experience and skills you already have.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic afterSignOutUrl="/">
      <html lang="en" className={`${display.variable} ${sans.variable}`}>
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
