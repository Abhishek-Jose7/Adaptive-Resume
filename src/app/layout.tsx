import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Maker - Truth-Bound ATS Tailoring",
  description: "Tailor resumes strictly from your career facts with ATS match scoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html lang="en">
        <body className="antialiased min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}
