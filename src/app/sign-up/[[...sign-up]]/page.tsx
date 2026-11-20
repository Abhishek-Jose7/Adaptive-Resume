import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#becbbf] px-4 py-12 text-[#10241c]">
      <Link href="/" className="mb-6 flex items-center gap-2 group">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10241c] font-black text-white text-base shadow-md group-hover:scale-105 transition-transform">
          a.
        </span>
        <span className="text-2xl font-black text-[#10241c] tracking-tight">Adaptive Resume</span>
      </Link>

      <div className="mb-6 text-center max-w-sm space-y-1">
        <h2 className="text-xl font-black text-[#10241c] tracking-tight">Create your account</h2>
        <p className="text-xs text-[#10241c]/80 font-medium">
          Start shaping targeted resumes strictly from your authentic work history.
        </p>
      </div>

      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white border-2 border-[#10241c] shadow-2xl rounded-2xl p-6 sm:p-8",
              headerTitle: "text-[#10241c] font-black tracking-tight text-xl",
              headerSubtitle: "text-[#10241c]/70 text-xs font-medium",
              formButtonPrimary: "bg-[#10241c] hover:bg-[#0A0A66] text-white font-bold text-sm rounded-xl py-3 shadow-md normal-case transition-all",
              formFieldInput: "bg-white border-2 border-[#10241c]/20 focus:border-[#10241c] text-[#10241c] font-medium rounded-xl text-sm py-2.5 transition-colors",
              formFieldLabel: "text-[#10241c] text-xs font-bold uppercase tracking-wider",
              socialButtonsBlockButton: "border-2 border-[#10241c]/20 text-[#10241c] font-bold text-sm rounded-xl hover:bg-[#becbbf]/15 transition-colors",
              socialButtonsBlockButtonText: "text-[#10241c] font-bold text-xs",
              dividerLine: "bg-[#10241c]/15",
              dividerText: "text-[#10241c]/60 text-xs font-semibold uppercase",
              footerActionLink: "text-[#10241c] hover:underline font-bold text-xs",
              footerActionText: "text-[#10241c]/70 text-xs font-medium",
              identityPreviewText: "text-[#10241c] font-semibold text-xs",
              identityPreviewEditButton: "text-[#10241c] font-bold hover:underline text-xs",
            },
          }}
        />
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-xs font-bold text-[#10241c] hover:underline underline-offset-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to homepage</span>
      </Link>
    </div>
  );
}
