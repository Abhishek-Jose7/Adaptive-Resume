import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Target,
  FileText,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  ChevronRight,
  TrendingUp,
  BarChart3,
  HelpCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* SaaS Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/20">
              R
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">ResumeMaker</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                SaaS v1.2
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#truth-bound" className="hover:text-white transition-colors">
              Truth-Bound AI
            </Link>
            <Link href="#career-graph" className="hover:text-white transition-colors">
              Career Graph
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">
              Free Tier
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings/providers"
              className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              BYOK Setup
            </Link>
            <Link
              href="/bank"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Glow decorative gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[400px] h-[250px] bg-indigo-600/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold mb-8 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero AI Hallucinations • 100% Free Tier • Strict Data Integrity</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight sm:leading-none">
            Tailor high-impact resumes with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
              zero fabricated claims.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            ResumeMaker is the single source of truth for your career. Grounded in your personal Data Bank
            and Career Graph, our AI tailors keywords, scores ATS alignment, and optimizes page layout
            without ever inventing experience, metrics, or buzzwords.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/bank"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <span>Start Building Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/bank/intake"
              className="px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Import Existing Resume</span>
            </Link>
          </div>

          {/* Social Proof / Integrity Metrics */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 pt-8 text-left">
            <div>
              <div className="text-2xl font-bold text-white flex items-center gap-1.5">
                <span>0.0%</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Hallucination Tolerance</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">&lt; 1 ms</div>
              <p className="text-xs text-slate-400 mt-0.5">PostgreSQL Index Scans</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">4 Templates</div>
              <p className="text-xs text-slate-400 mt-0.5">ATS-Grade Fixed Layouts</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">$0 / mo</div>
              <p className="text-xs text-slate-400 mt-0.5">Forever Free Core Tier</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Mockup Preview */}
      <section className="py-12 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-5 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs text-slate-400 font-mono">
                ResumeStudio • Tailoring Engine • Active Session
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Match Score: 92/100
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Truth-Bound Validated
              </span>
            </div>
          </div>

          {/* Split Mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* Left: Grounded Evidence & Tailoring Controls */}
            <div className="lg:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  Grounded Evidence
                </span>
                <span className="text-[10px] text-slate-400">Section 10.4 Entailment</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-300">Target Role: Staff Distributed Systems</span>
                  <span className="text-emerald-400 font-mono">Must-Have: 100%</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300">
                  Architected Rust event pipeline processing 250M events/day with 45% latency reduction.
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/50">
                    Fact: -45% latency
                  </span>
                  <span className="px-1.5 py-0.5 bg-indigo-900/40 text-indigo-300 rounded border border-indigo-800/50">
                    Tool: Rust, Kafka
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-800/50">
                    Verified
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2 text-xs">
                <div className="text-slate-400 font-semibold text-slate-300">
                  Truth-Bound Rewriting Guardrails
                </div>
                <div className="space-y-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>No ungrounded metrics or tools injected</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Experience isolation enforced across projects</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Scope preservation (assisted ≠ led)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Resume Canvas Preview */}
            <div className="lg:col-span-7 bg-white text-slate-900 rounded-xl p-6 shadow-inner space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-xl font-bold tracking-tight text-gray-900">Alex Rivera</h3>
                <p className="text-xs text-blue-700 font-medium mt-0.5">
                  Principal Systems Architect • alex@rivera.dev • San Francisco, CA
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-0.5">
                  Core Experience
                </h4>
                <div className="text-xs">
                  <div className="flex justify-between font-bold text-gray-800">
                    <span>Staff Infrastructure Engineer — CloudScale Inc</span>
                    <span className="text-gray-500 font-normal">2021 – Present</span>
                  </div>
                  <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1 text-[11px] leading-relaxed">
                    <li>
                      Architected high-throughput distributed ingestion pipelines using Rust and Apache Kafka,
                      slashing tail latency by 45% across 250M daily events.
                    </li>
                    <li>
                      Spearheaded cross-region replication strategy with Neon PostgreSQL and Drizzle ORM,
                      maintaining 99.99% availability during peak workloads.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-0.5">
                  Technical Competencies
                </h4>
                <p className="text-[11px] text-gray-600">
                  <strong className="text-gray-800">Languages &amp; Runtimes:</strong> Rust, TypeScript, Python, SQL, Go<br />
                  <strong className="text-gray-800">Data &amp; Cloud:</strong> PostgreSQL (Neon), Apache Kafka, Redis, Docker, AWS
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section id="features" className="py-24 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enterprise-Grade Architecture Built for Integrity
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              Every feature adheres to strict provenance, tenant isolation, and $0 monthly spend constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Truth-Bound Tailoring */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Truth-Bound Tailoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 10.4 deterministic validation blocks hallucinated tools, metrics, and verb promotions.
                Every bullet is mathematically entailed by your Data Bank.
              </p>
              <Link href="/jobs" className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                Explore Tailoring Engine <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 2. Career Graph */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Career Graph</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explicit typed network linking your skills to the exact projects and experiences where you
                actually applied them, avoiding false assumptions of production readiness.
              </p>
              <Link href="/bank" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                View Career Graph <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3. 7-Dimension Match Score */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-600/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">7-Dimension Match Score</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluates Must-Have keywords, Nice-to-Have keywords, Achievement density, Responsibility
                alignment, Seniority, Skills evidence, and ATS parseability.
              </p>
              <Link href="/jobs" className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                Analyze Job Descriptions <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 4. One-Page Auto-Fit Ladder */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">One-Page Auto-Fit Ladder</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deterministic 8-step typographic ladder adjusts margins, font sizes, and line heights so your
                resume fits the target page count without truncating words or breaking formatting.
              </p>
              <Link href="/resumes" className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1">
                Test ATS Templates <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 5. Project Maturity & Honest Scope */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Project Maturity &amp; Scope</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Categorizes projects honestly (idea, prototype, partially implemented, completed, deployed).
                Never inflates unverified hackathons into "enterprise-grade" platforms.
              </p>
              <Link href="/jobs" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                Project Recommendations <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 6. Pre-Export Quality Gate */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Pre-Export Quality Gate</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Validates date consistency, checks for broken links, scans for duplicate bullets, and
                independently audits generated PDF and DOCX binaries before download.
              </p>
              <Link href="/resumes" className="text-xs font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1">
                Inspect Quality Gates <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / $0 Transparency Section */}
      <section id="pricing" className="py-24 border-t border-slate-800/80 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              100% Free Core Tier • Honest Quotas
            </h2>
            <p className="mt-4 text-slate-400 text-sm">
              We believe career software should not hold your resume hostage behind surprise paywalls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Card 1: Core Free Tier */}
            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-slate-950 p-8 space-y-6 flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Standard Free Tier
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-sm text-slate-400">/ forever</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Zero credit card required. Free tier accounts on Neon PostgreSQL and Clerk.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>50 AI tailoring generations / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>20 PDF &amp; DOCX exports / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Up to 500 Data Bank entries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>4 ATS templates &amp; One-Page Auto-Fit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>6-Stage Application Kanban board</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/bank"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs text-center transition-colors block"
              >
                Get Started Free
              </Link>
            </div>

            {/* Card 2: BYOK Power User */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 space-y-6 flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  BYOK (Bring Your Own Key)
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-sm text-slate-400">platform fee</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Provide your own free Google Gemini or Groq API key with AES-256-GCM encryption.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Unlimited AI generations (provider limits)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Direct client AES-256-GCM encryption at rest</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Supports Gemini 1.5 Flash and Groq Llama 3.3</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Unlimited resume versions &amp; branching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Full GDPR account export &amp; cascading deletion</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/settings/providers"
                className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 text-slate-200 font-semibold text-xs text-center transition-colors block"
              >
                Configure BYOK Keys
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              R
            </div>
            <span className="text-slate-400 font-semibold">ResumeMaker Platform</span>
            <span>• PRD v1.2 Compliant</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/bank" className="hover:text-slate-300 transition-colors">
              Data Bank
            </Link>
            <Link href="/jobs" className="hover:text-slate-300 transition-colors">
              Jobs Studio
            </Link>
            <Link href="/resumes" className="hover:text-slate-300 transition-colors">
              Resume Editor
            </Link>
            <Link href="/applications" className="hover:text-slate-300 transition-colors">
              Applications
            </Link>
            <Link href="/settings/privacy" className="hover:text-slate-300 transition-colors">
              Privacy &amp; GDPR
            </Link>
          </div>

          <p>© {new Date().getFullYear()} ResumeMaker. Truth-bound resume engineering.</p>
        </div>
      </footer>
    </div>
  );
}
