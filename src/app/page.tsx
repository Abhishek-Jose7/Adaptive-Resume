import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { AdaptiveResumeWorkspace } from "@/components/workspace/AdaptiveResumeWorkspace";
import DashboardLayout from "@/app/(dashboard)/layout";
import { RevealSection } from "@/components/marketing/RevealSection";
import { TransformationCarousel } from "@/components/marketing/TransformationCarousel";
import {
  ArrowDown,
  MoveRight,
  CheckCircle2,
  FileText,
  Fingerprint,
  Sparkles,
  ShieldCheck,
  Upload,
  Layers,
  Search,
  Eye,
} from "lucide-react";

function HeroWorkbenchPreview() {
  return (
    <div
      className="w-full rounded-2xl border-2 border-[#000052]/20 bg-white shadow-2xl overflow-hidden"
      aria-label="Interactive workspace preview"
    >
      {/* Top Window Chrome */}
      <div className="bg-[#000052] px-4 py-3 flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/40 inline-block" />
          <span className="ml-2 font-bold tracking-wide text-[#B2BEB5]">WORKSPACE PREVIEW</span>
        </div>
        <div className="text-[#B2BEB5] font-semibold text-[11px] truncate max-w-[200px]">
          Staff Systems Architect / Acme Corp
        </div>
      </div>

      {/* Dual Column Workbench */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#000052]/10 bg-white p-4 sm:p-6 gap-6">
        {/* Left: Job Description Pane */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#000052]/70 mb-2">
              <Search className="w-3.5 h-3.5 text-[#000052]" />
              <span>Target Role Spec</span>
            </div>
            <h3 className="text-xl font-extrabold text-[#000052] tracking-tight">Staff Systems Architect</h3>
            <p className="text-xs font-bold text-[#000052]/60 mt-0.5">Distributed Cloud Infrastructure • Full-Time</p>

            <div className="mt-4 p-3.5 rounded-xl bg-[#B2BEB5]/20 border border-[#000052]/10 text-xs text-[#000052] leading-relaxed">
              "Seeking an architect with deep hands-on expertise building fault-tolerant, high-throughput distributed systems. Must have proven track record with Kubernetes, Redis clustering, and sub-second p99 latency optimization."
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase text-[#000052]/60 block mb-2">Detected Key Qualifications</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#000052] text-white text-[11px] font-bold">Distributed Systems</span>
              <span className="px-2 py-0.5 rounded bg-[#000052] text-white text-[11px] font-bold">Redis Clustering</span>
              <span className="px-2 py-0.5 rounded bg-[#000052] text-white text-[11px] font-bold">p99 Latency</span>
            </div>
          </div>
        </div>

        {/* Right: Tailored Resume Draft Pane */}
        <div className="flex flex-col justify-between space-y-4 md:pl-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#000052]/70">
                <FileText className="w-3.5 h-3.5 text-[#000052]" />
                <span>Tailored Resume Draft</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#000052] text-white text-[10px] font-extrabold tracking-wide">
                98% Fit
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#000052]/15">
              <div className="text-xs font-bold text-[#000052] flex justify-between">
                <span>Selected Experience</span>
                <span className="text-[#000052]/60">2021 — 2025</span>
              </div>
              <p className="text-xs text-[#000052] font-semibold mt-1.5 leading-relaxed">
                • Engineered distributed consensus pipeline handling 250,000 requests/sec with 99.999% uptime, lowering p99 database latency by 45% via Redis read-through clustering.
              </p>
              <div className="mt-2.5 pt-2 border-t border-[#000052]/10 flex items-center gap-1.5 text-[10px] font-bold text-[#000052]">
                <CheckCircle2 className="w-3 h-3 text-[#000052]" />
                <span>Anchored to Data Bank: "Distributed Consensus Engine"</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-[#000052]/70">You approve every line before export.</span>
            <div className="inline-flex items-center gap-1 font-extrabold text-[#000052] hover:underline cursor-pointer">
              <span>Inspect proof</span>
              <MoveRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#B2BEB5]/25 px-5 py-2.5 border-t border-[#000052]/10 flex items-center gap-2 text-xs text-[#000052] font-bold">
        <ShieldCheck className="w-4 h-4 text-[#000052]" />
        <span>100% verified against your career facts. Zero AI hallucinations.</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Show when="signed-in">
        <DashboardLayout>
          <AdaptiveResumeWorkspace />
        </DashboardLayout>
      </Show>

      <Show when="signed-out">
        <div className="min-h-screen bg-[#B2BEB5] text-[#000052] font-sans antialiased overflow-x-hidden">
          {/* Top Navigation */}
          <header className="sticky top-0 z-50 bg-[#B2BEB5]/90 backdrop-blur-md border-b-2 border-[#000052]/15 px-4 sm:px-8 py-3.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#000052]">
                <span className="w-7 h-7 rounded-lg bg-[#000052] text-white flex items-center justify-center font-black text-sm shadow-md">
                  A
                </span>
                <span>
                  Adaptive <strong className="font-black">Resume</strong>
                </span>
              </Link>

              <nav className="flex items-center gap-4 sm:gap-6" aria-label="Main Navigation">
                <Link
                  href="#how-it-works"
                  className="hidden md:inline-block text-sm font-bold text-[#000052] hover:underline underline-offset-4"
                >
                  How it works
                </Link>
                <Link
                  href="#transformation-showcase"
                  className="hidden md:inline-block text-sm font-bold text-[#000052] hover:underline underline-offset-4"
                >
                  Showcase
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs sm:text-sm font-bold text-[#000052] hover:underline underline-offset-4"
                >
                  Privacy
                </Link>
                <SignInButton mode="modal">
                  <button className="text-xs sm:text-sm font-bold text-[#000052] hover:underline underline-offset-4 cursor-pointer">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#000052] text-white text-xs sm:text-sm font-extrabold shadow-md hover:bg-[#0A0A66] transition-all duration-150 cursor-pointer">
                    <span>Make a resume</span>
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                </SignUpButton>
              </nav>
            </div>
          </header>

          <main>
            {/* Redesigned Hero Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-center">
                {/* Hero Left Copy */}
                <div className="lg:col-span-5 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#000052] text-[#B2BEB5] text-xs font-black tracking-wider uppercase shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[#B2BEB5]" />
                    <span>Real Experience • Zero Hallucination</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-[1.05]">
                    Your next role,
                    <br />
                    <span className="italic font-normal underline decoration-[#000052]/30">grounded in your work.</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#000052]/85 font-medium leading-relaxed max-w-xl">
                    Paste a job description. See a tailored resume draft shaped strictly from your authentic career history, with every line verified against your private Data Bank and ready for your review.
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 pt-2">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#000052] text-white text-sm sm:text-base font-extrabold shadow-lg hover:bg-[#0A0A66] hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                        <span>Paste a job description</span>
                        <MoveRight className="w-4 h-4" />
                      </button>
                    </SignUpButton>
                    <Link
                      href="#transformation-showcase"
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/70 border-2 border-[#000052] text-[#000052] text-sm sm:text-base font-extrabold hover:bg-white transition-all duration-150 shadow-sm"
                    >
                      <span>Explore showcase</span>
                      <ArrowDown className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 pt-4 text-xs font-bold text-[#000052]/75">
                    <Fingerprint className="w-4 h-4 text-[#000052]" />
                    <span>Your experience stays yours. You approve every suggestion.</span>
                  </div>
                </div>

                {/* Hero Right Visual Preview */}
                <div className="lg:col-span-7 w-full min-w-0">
                  <HeroWorkbenchPreview />
                </div>
              </div>
            </section>

            {/* Large Bold Editorial Typography (Directly on Ash Gray, No Boxed Strip) */}
            <section
              className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
              aria-label="Workflow Principles"
            >
              <div className="space-y-10 sm:space-y-14">
                {/* 4 sequential bold statements */}
                <div className="space-y-4 sm:space-y-6">
                  <RevealSection>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-tight">
                      Load your resume
                    </h2>
                  </RevealSection>
                  <RevealSection>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-tight">
                      Paste your work history
                    </h2>
                  </RevealSection>
                  <RevealSection>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-tight">
                      Review every detail
                    </h2>
                  </RevealSection>
                  <RevealSection>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-tight">
                      Start with the job you want
                    </h2>
                  </RevealSection>
                </div>

                {/* Central Manifesto */}
                <RevealSection className="pt-10 sm:pt-14 border-t-2 border-[#000052]/20 space-y-4">
                  <h3 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#000052] tracking-tight leading-[1.05]">
                    Your work, shaped for this role.
                  </h3>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#000052]/80 leading-relaxed max-w-4xl">
                    Keep the details once. Bring the right ones forward when a new opportunity comes along.
                  </p>
                </RevealSection>
              </div>
            </section>

            {/* Scroll-Triggered Carousel & Gallery */}
            <div id="transformation-showcase">
              <TransformationCarousel />
            </div>

            {/* How It Works 3-Step Section */}
            <RevealSection className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24" id="how-it-works">
              <div className="border-b-2 border-[#000052]/20 pb-8 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#000052]/60">System Architecture</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#000052] tracking-tight mt-1">
                    Three steps to your targeted resume.
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-[#000052]/80 max-w-md font-medium">
                  Designed for candidates who value precision, accuracy, and total control over their professional narrative.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/15 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Upload className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#000052] mb-2">1. Build your Data Bank</h3>
                    <p className="text-sm text-[#000052]/80 leading-relaxed font-normal">
                      Store your genuine work experience, education, publications, and projects in one organized vault. Import existing files in seconds.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#000052] hover:underline cursor-pointer">
                        <span>Build your Data Bank</span>
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    </SignUpButton>
                  </div>
                </article>

                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/15 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Layers className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#000052] mb-2">2. Match to the target role</h3>
                    <p className="text-sm text-[#000052]/80 leading-relaxed font-normal">
                      Paste the employer's job description. Our matching engine selects the most impactful career achievements that directly answer the job requirements.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#000052] hover:underline cursor-pointer">
                        <span>Tailor a resume</span>
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    </SignUpButton>
                  </div>
                </article>

                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/15 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Eye className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#000052] mb-2">3. Review and export</h3>
                    <p className="text-sm text-[#000052]/80 leading-relaxed font-normal">
                      Every generated bullet links back to an authentic entry in your Data Bank. Approve, tweak, or reject every suggestion before exporting clean ATS-ready PDF or text.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <Link href="/privacy" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#000052] hover:underline">
                      <span>How data is safeguarded</span>
                      <MoveRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              </div>
            </RevealSection>

            {/* Privacy & Trust Band */}
            <RevealSection className="w-full bg-[#000052] text-white py-14 px-4 sm:px-6 lg:px-8 border-y-2 border-[#000052]">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 text-left">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#B2BEB5] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#B2BEB5]" />
                    <span>Privacy First Architecture</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Your career is personal. Your data stays yours.
                  </h2>
                  <p className="text-sm text-[#B2BEB5] max-w-xl font-normal">
                    We never sell career data or train public models on your private documents. Contact details remain strictly private unless you export and send your resume.
                  </p>
                </div>
                <Link
                  href="/privacy"
                  className="px-5 py-3 rounded-xl bg-white text-[#000052] hover:bg-[#B2BEB5] text-xs sm:text-sm font-extrabold transition-all duration-150 shadow-md whitespace-nowrap"
                >
                  Read privacy architecture →
                </Link>
              </div>
            </RevealSection>

            {/* Final CTA Section */}
            <RevealSection className="py-20 sm:py-28 px-4 text-center max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black text-[#000052] tracking-tight">
                Ready to craft your next resume?
              </h2>
              <p className="text-base sm:text-lg text-[#000052]/80 font-semibold max-w-xl mx-auto">
                Start with a target job description. Bring forward the work you have already accomplished.
              </p>
              <div className="pt-2">
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#000052] text-white text-base font-extrabold shadow-xl hover:bg-[#0A0A66] hover:scale-105 transition-all duration-150 cursor-pointer">
                    <span>Make a resume for this job</span>
                    <MoveRight className="w-5 h-5" />
                  </button>
                </SignUpButton>
              </div>
            </RevealSection>
          </main>

          {/* Footer */}
          <footer className="border-t-2 border-[#000052]/20 py-8 px-4 sm:px-8 bg-[#B2BEB5] text-xs font-bold text-[#000052]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#000052] text-white flex items-center justify-center font-bold text-[10px]">
                  A
                </span>
                <span>Adaptive Resume — Grounded in the work you have actually done.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="#how-it-works" className="hover:underline">
                  How it works
                </Link>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/lracs" className="hover:underline">
                  Special
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </Show>
    </>
  );
}
