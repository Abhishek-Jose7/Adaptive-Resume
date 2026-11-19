import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <Link href="/" className="mb-7 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full rounded-bl-[8px] bg-stamp font-display text-[14px] font-semibold leading-none text-white">
          a.
        </span>
        <span className="font-display text-[17px] font-semibold tracking-tightest">Adaptive Resume</span>
      </Link>

      <p className="mb-5 max-w-[34ch] text-center text-[13px] leading-relaxed text-graphite">
        Start by adding a resume or a few details about your work. You choose which parts to use in each draft.
      </p>

      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-sheet border border-rule shadow-plate rounded-none",
            headerTitle: "font-display tracking-tight",
            formButtonPrimary: "bg-stamp hover:bg-stamp-dark text-white rounded-sm normal-case",
            formFieldInput: "bg-sheet border-rule-strong text-ink rounded-sm",
            formFieldLabel: "text-graphite text-[12px]",
            socialButtonsBlockButton: "border-rule text-ink rounded-sm",
            footerActionLink: "text-stamp hover:text-stamp-dark",
          },
        }}
      />

      <Link href="/" className="mt-6 text-[12px] text-graphite hover:text-ink">
        Back to Adaptive Resume
      </Link>
    </div>
  );
}
