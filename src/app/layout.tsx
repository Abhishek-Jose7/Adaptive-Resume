import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Resume — A Resume Grounded In Your Work",
  description:
    "Shape a resume around the job you want, using the experience and skills you already have.",
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
          colorPrimary: "#000052",
          colorBackground: "#FFFFFF",
          borderRadius: "0.5rem",
          fontFamily: "IBM Plex Sans, sans-serif",
        },
        elements: {
          card: "border-2 border-[#B2BEB5] shadow-2xl rounded-2xl bg-white",
          headerTitle: "text-[#000052] font-extrabold text-2xl tracking-tight",
          headerSubtitle: "text-[#3B4740] font-medium text-sm",
          formButtonPrimary:
            "bg-[#000052] hover:bg-[#0A0A66] text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-md",
          formFieldInput:
            "border border-[#B2BEB5] focus:border-[#000052] focus:ring-2 focus:ring-[#000052]/20 text-[#000052]",
          footerActionLink: "text-[#000052] hover:underline font-bold",
          identityPreviewText: "text-[#000052] font-semibold",
          socialButtonsBlockButton:
            "border border-[#B2BEB5] text-[#000052] hover:bg-[#B2BEB5]/15 font-semibold",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen antialiased bg-[#B2BEB5] text-[#000052]">{children}</body>
      </html>
    </ClerkProvider>
  );
}
