import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Resume — One honest career. Every right version.",
  description:
    "Turn your real projects, internships and skills into a resume that speaks directly to every job—without inventing a single thing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      dynamic
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#10241c",
          colorBackground: "#faf8f2",
          borderRadius: "0.25rem",
          fontFamily: "'Instrument Sans', sans-serif",
        },
        elements: {
          card: "border border-[rgba(16,36,28,0.17)] shadow-2xl rounded-lg bg-[#faf8f2]",
          headerTitle: "text-[#10241c] font-bold text-2xl tracking-tight",
          headerSubtitle: "text-[#425048] font-medium text-sm",
          formButtonPrimary:
            "bg-[#10241c] hover:bg-[#1f382e] text-[#eee9df] font-bold py-2.5 px-4 rounded transition-all shadow-sm hover:shadow-[4px_4px_0_#d8c49b]",
          formFieldInput:
            "border border-[rgba(16,36,28,0.17)] focus:border-[#a98452] focus:ring-2 focus:ring-[#a98452]/20 text-[#10241c] bg-white",
          footerActionLink: "text-[#a98452] hover:underline font-bold",
          identityPreviewText: "text-[#10241c] font-semibold",
          socialButtonsBlockButton:
            "border border-[rgba(16,36,28,0.17)] text-[#10241c] hover:bg-[#eee9df]/50 font-semibold",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen antialiased bg-[var(--cream)] text-[var(--ink)]">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
