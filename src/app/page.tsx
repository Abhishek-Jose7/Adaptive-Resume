"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { AdaptiveResumeWorkspace } from "@/components/workspace/AdaptiveResumeWorkspace";
import DashboardLayout from "@/app/(dashboard)/layout";
import { RevealSection } from "@/components/marketing/RevealSection";
import { TransformationCarousel } from "@/components/marketing/TransformationCarousel";
import { ResumeInspectionGallery } from "@/components/marketing/ResumeInspectionGallery";
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
  SlidersHorizontal,
  Check,
} from "lucide-react";

interface HeroRoleSpec {
  id: string;
  tabLabel: string;
  roleTitle: string;
  department: string;
  jobRequirement: string;
  requiredSkills: string[];
  tailoredBullet: string;
  anchoredFact: string;
  matchScore: number;
}

const HERO_ROLES: HeroRoleSpec[] = [
  {
    id: "systems",
    tabLabel: "Distributed Systems",
    roleTitle: "Staff Systems Architect",
    department: "Cloud Infrastructure • Distributed Systems",
    jobRequirement:
      "Seeking a systems architect to scale fault-tolerant distributed consensus pipelines with sub-second p99 latency guarantees and high-throughput Redis clustering.",
    requiredSkills: ["Distributed Systems", "Redis Clustering", "p99 Latency Optimization", "Cloudflare Workers"],
    tailoredBullet:
      "Engineered edge-native consensus pipeline handling 250,000 requests/sec with 99.999% uptime, lowering database p99 latency by 45% via Redis read-through clustering and Cloudflare Workers.",
    anchoredFact: "Anchored to Data Bank: 'Distributed Consensus Engine Project'",
    matchScore: 98,
  },
  {
    id: "genai",
    tabLabel: "AI & GenAI",
    roleTitle: "Senior AI Systems Engineer",
    department: "Applied AI Lab • Agent Systems",
    jobRequirement:
      "Looking for an AI engineer to architect production RAG pipelines, manage vector databases, and implement deterministic fallback safeguards for LLM outputs.",
    requiredSkills: ["RAG Pipelines", "Vector Search", "LLM Guardrails", "pgvector"],
    tailoredBullet:
      "Architected production RAG ingestion pipeline combining pgvector with hybrid keyword search, cutting hallucination rates to <0.8% with sub-250ms deterministic fallback failovers.",
    anchoredFact: "Anchored to Data Bank: 'Legal Guidance RAG Platform'",
    matchScore: 97,
  },
  {
    id: "fullstack",
    tabLabel: "Full-Stack & Cloud",
    roleTitle: "Lead Full-Stack Engineer",
    department: "Core Product • Web Infrastructure",
    jobRequirement:
      "Lead web engineering for developer-facing portals. Experience with Next.js, Prisma ORM, PostgreSQL, and high-concurrency event registration platforms required.",
    requiredSkills: ["Next.js 14+", "Prisma ORM", "PostgreSQL", "QR Telemetry"],
    tailoredBullet:
      "Architected core event infrastructure using Next.js and Prisma ORM for Bit n Build, managing registration, team workflows, and QR-based verification for 1,500+ participants across 680+ teams.",
    anchoredFact: "Anchored to Data Bank: 'GDG CRCE Technical Lead Experience'",
    matchScore: 99,
  },
];

function HeroWorkbenchPreview() {
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const activeRole = HERO_ROLES[activeRoleIdx];

  return (
    <div
      className="w-full rounded-2xl border-2 border-[#000052]/25 bg-white shadow-2xl overflow-hidden text-left"
      aria-label="Interactive workspace preview"
    >
      {/* Top Window Chrome with Role Switcher Tabs */}
      <div className="bg-[#000052] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/50 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/50 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#B2BEB5]/50 inline-block" />
          <span className="ml-2 font-black tracking-wide text-white text-[11px] uppercase">
            LIVE ADAPTIVE ENGINE
          </span>
        </div>

        {/* Role Toggle Pills */}
        <div className="flex items-center gap-1.5 bg-[#00003D] p-1 rounded-lg border border-white/10">
          {HERO_ROLES.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleIdx(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition-all duration-150 cursor-pointer ${
                activeRoleIdx === idx
                  ? "bg-[#B2BEB5] text-[#000052] shadow-sm font-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {role.tabLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Column Workbench */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#000052]/15 bg-white p-5 sm:p-6 gap-6">
        {/* Left: Job Description Pane */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#000052] mb-1.5">
              <Search className="w-3.5 h-3.5 text-[#000052]" />
              <span>Target Role Requirements</span>
            </div>
            <h3 className="text-xl font-black text-[#000052] tracking-tight">{activeRole.roleTitle}</h3>
            <p className="text-xs font-bold text-[#000052]/70 mt-0.5">{activeRole.department}</p>

            <div className="mt-3.5 p-3.5 rounded-xl bg-[#B2BEB5]/25 border-1.5 border-[#000052]/15 text-xs text-[#000052] font-semibold leading-relaxed">
              "{activeRole.jobRequirement}"
            </div>
          </div>

          <div>
            <span className="text-[11px] font-black uppercase text-[#000052] block mb-2">Detected Qualifications</span>
            <div className="flex flex-wrap gap-1.5">
              {activeRole.requiredSkills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 rounded bg-[#000052] text-white text-[11px] font-bold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tailored Resume Draft Pane */}
        <div className="flex flex-col justify-between space-y-4 md:pl-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#000052]">
                <FileText className="w-3.5 h-3.5 text-[#000052]" />
                <span>Tailored Resume Draft</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#000052] text-white text-[11px] font-black tracking-wide">
                {activeRole.matchScore}% Match
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F9F8] border-1.5 border-[#000052]/20">
              <div className="text-xs font-black text-[#000052] flex justify-between">
                <span>Selected Fact from Data Bank</span>
                <span className="text-[#000052]/70">Verified</span>
              </div>
              <p className="text-xs text-[#000052] font-bold mt-2 leading-relaxed">
                • {activeRole.tailoredBullet}
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#000052]/15 flex items-center gap-1.5 text-[10px] font-black text-[#000052]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#000052]" />
                <span>{activeRole.anchoredFact}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-[#000052]/80">Zero AI Hallucinations Guaranteed.</span>
            <div className="inline-flex items-center gap-1 font-black text-[#000052] hover:underline cursor-pointer">
              <span>Inspect proof</span>
              <MoveRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#B2BEB5]/30 px-5 py-3 border-t border-[#000052]/15 flex items-center justify-between text-xs text-[#000052] font-black">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#000052]" />
          <span>100% Truth-Bound: You review and approve every single line before export.</span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#000052]/70">
          Sub-2s Realtime ATS Match
        </span>
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
          <header className="sticky top-0 z-50 bg-[#B2BEB5]/95 backdrop-blur-md border-b-2 border-[#000052]/15 px-4 sm:px-8 py-3.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-[#000052]">
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
                  className="hidden md:inline-block text-sm font-extrabold text-[#000052] hover:underline underline-offset-4"
                >
                  How it works
                </Link>
                <Link
                  href="#transformation-showcase"
                  className="hidden md:inline-block text-sm font-extrabold text-[#000052] hover:underline underline-offset-4"
                >
                  Showcase
                </Link>
                <Link
                  href="#templates"
                  className="hidden md:inline-block text-sm font-extrabold text-[#000052] hover:underline underline-offset-4"
                >
                  Templates
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs sm:text-sm font-extrabold text-[#000052] hover:underline underline-offset-4"
                >
                  Privacy
                </Link>
                <SignInButton mode="modal">
                  <button className="text-xs sm:text-sm font-extrabold text-[#000052] hover:underline underline-offset-4 cursor-pointer">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#000052] text-white text-xs sm:text-sm font-black shadow-md hover:bg-[#0A0A66] transition-all duration-150 cursor-pointer">
                    <span>Make a resume</span>
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                </SignUpButton>
              </nav>
            </div>
          </header>

          <main>
            {/* Opulent Hero Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-center">
                {/* Hero Left Copy */}
                <div className="lg:col-span-5 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#000052] text-[#B2BEB5] text-xs font-black tracking-wider uppercase shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[#B2BEB5]" />
                    <span>Real Experience • Zero Hallucination</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#000052] tracking-tight leading-[1.03]">
                    Your next role,
                    <br />
                    <span className="italic font-extrabold underline decoration-[#000052]/30">grounded in your work.</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#000052] font-bold leading-relaxed max-w-xl">
                    Paste a job description. See a tailored resume draft shaped strictly from your authentic career history, with every single line verified against your private Data Bank and ready for your review.
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 pt-2">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#000052] text-white text-sm sm:text-base font-black shadow-lg hover:bg-[#0A0A66] hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                        <span>Paste a job description</span>
                        <MoveRight className="w-4 h-4" />
                      </button>
                    </SignUpButton>
                    <Link
                      href="#transformation-showcase"
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white border-2 border-[#000052] text-[#000052] text-sm sm:text-base font-black hover:bg-[#B2BEB5] transition-all duration-150 shadow-sm"
                    >
                      <span>Explore showcase</span>
                      <ArrowDown className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 pt-3 text-xs font-black text-[#000052]">
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

            {/* Large Bold Editorial Typography (Directly on Ash Gray, High-Contrast Text) */}
            <section
              className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
              aria-label="Workflow Principles"
            >
              <div className="space-y-12 sm:space-y-16">
                {/* 4 sequential bold statements with metadata chips */}
                <div className="space-y-6 sm:space-y-8">
                  <RevealSection className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-[#000052]/20 pb-6">
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#000052] tracking-tighter leading-tight">
                      Load your resume
                    </h2>
                    <span className="text-xs font-black uppercase tracking-wider text-[#000052] bg-white/70 px-3 py-1.5 rounded-lg border border-[#000052]/20 shadow-sm w-fit">
                      PDF • DOCX • Vision OCR
                    </span>
                  </RevealSection>

                  <RevealSection className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-[#000052]/20 pb-6">
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#000052] tracking-tighter leading-tight">
                      Paste your work history
                    </h2>
                    <span className="text-xs font-black uppercase tracking-wider text-[#000052] bg-white/70 px-3 py-1.5 rounded-lg border border-[#000052]/20 shadow-sm w-fit">
                      Persistent Data Bank Vault
                    </span>
                  </RevealSection>

                  <RevealSection className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-[#000052]/20 pb-6">
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#000052] tracking-tighter leading-tight">
                      Review every detail
                    </h2>
                    <span className="text-xs font-black uppercase tracking-wider text-[#000052] bg-white/70 px-3 py-1.5 rounded-lg border border-[#000052]/20 shadow-sm w-fit">
                      100% Fact Provenance
                    </span>
                  </RevealSection>

                  <RevealSection className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-[#000052]/20 pb-6">
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#000052] tracking-tighter leading-tight">
                      Start with the job you want
                    </h2>
                    <span className="text-xs font-black uppercase tracking-wider text-[#000052] bg-white/70 px-3 py-1.5 rounded-lg border border-[#000052]/20 shadow-sm w-fit">
                      Realtime ATS Matching
                    </span>
                  </RevealSection>
                </div>

                {/* Central Manifesto */}
                <RevealSection className="pt-12 sm:pt-16 border-t-2 border-[#000052] space-y-5">
                  <h3 className="text-4xl sm:text-6xl lg:text-8xl font-black text-[#000052] tracking-tighter leading-[1.02]">
                    Your work, shaped for this role.
                  </h3>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-black text-[#000052] leading-relaxed max-w-5xl">
                    Keep the details once. Bring the right ones forward when a new opportunity comes along.
                  </p>
                </RevealSection>
              </div>
            </section>

            {/* Scroll-Triggered Transformation Gallery */}
            <div id="transformation-showcase">
              <TransformationCarousel />
            </div>

            {/* Interactive Template Inspection Gallery */}
            <div id="templates">
              <ResumeInspectionGallery />
            </div>

            {/* How It Works 3-Step Architecture */}
            <RevealSection className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24" id="how-it-works">
              <div className="border-b-2 border-[#000052]/20 pb-8 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#000052]">System Architecture</span>
                  <h2 className="text-3xl sm:text-5xl font-black text-[#000052] tracking-tight mt-1">
                    Three steps to your targeted resume.
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-[#000052] max-w-md font-bold">
                  Designed for candidates who value precision, accuracy, and total control over their professional narrative.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Upload className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#000052] mb-2">1. Build your Data Bank</h3>
                    <p className="text-sm text-[#000052] leading-relaxed font-semibold">
                      Store your genuine work experience, education, publications, and projects in one organized vault. Import existing files in seconds.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-1.5 text-xs font-black text-[#000052] hover:underline cursor-pointer">
                        <span>Build your Data Bank</span>
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    </SignUpButton>
                  </div>
                </article>

                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Layers className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#000052] mb-2">2. Match to the target role</h3>
                    <p className="text-sm text-[#000052] leading-relaxed font-semibold">
                      Paste the employer's job description. Our matching engine selects the most impactful career achievements that directly answer the job requirements.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center gap-1.5 text-xs font-black text-[#000052] hover:underline cursor-pointer">
                        <span>Tailor a resume</span>
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    </SignUpButton>
                  </div>
                </article>

                <article className="bg-white p-7 rounded-2xl border-2 border-[#000052]/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#000052] text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                      <Eye className="w-5 h-5 text-[#B2BEB5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#000052] mb-2">3. Review and export</h3>
                    <p className="text-sm text-[#000052] leading-relaxed font-semibold">
                      Every generated bullet links back to an authentic entry in your Data Bank. Approve, tweak, or reject every suggestion before exporting clean ATS-ready PDF or text.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#000052]/10">
                    <Link href="/privacy" className="inline-flex items-center gap-1.5 text-xs font-black text-[#000052] hover:underline">
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
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[#B2BEB5] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#B2BEB5]" />
                    <span>Privacy First Architecture</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    Your career is personal. Your data stays yours.
                  </h2>
                  <p className="text-sm text-[#B2BEB5] max-w-xl font-medium leading-relaxed">
                    We never sell career data or train public models on your private documents. Contact details remain strictly private unless you export and send your resume.
                  </p>
                </div>
                <Link
                  href="/privacy"
                  className="px-6 py-3.5 rounded-xl bg-white text-[#000052] hover:bg-[#B2BEB5] text-xs sm:text-sm font-black transition-all duration-150 shadow-md whitespace-nowrap"
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
              <p className="text-base sm:text-lg text-[#000052] font-black max-w-xl mx-auto">
                Start with a target job description. Bring forward the work you have already accomplished.
              </p>
              <div className="pt-2">
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#000052] text-white text-base font-black shadow-xl hover:bg-[#0A0A66] hover:scale-105 transition-all duration-150 cursor-pointer">
                    <span>Make a resume for this job</span>
                    <MoveRight className="w-5 h-5" />
                  </button>
                </SignUpButton>
              </div>
            </RevealSection>
          </main>

          {/* Footer */}
          <footer className="border-t-2 border-[#000052]/20 py-8 px-4 sm:px-8 bg-[#B2BEB5] text-xs font-black text-[#000052]">
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
