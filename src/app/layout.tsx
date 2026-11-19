import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";

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
      <html lang="en">
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
