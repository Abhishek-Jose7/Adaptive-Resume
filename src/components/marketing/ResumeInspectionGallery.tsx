"use client";

import React, { useState } from "react";
import { CheckCircle2, Sparkles, Layers, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";

interface TemplateInfo {
  id: "modern-ats" | "luxurious-grid" | "compact-engineer";
  name: string;
  badge: string;
  description: string;
  atsScore: number;
  bestFor: string;
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: "modern-ats",
    name: "Modern ATS Standard",
    badge: "Most Popular",
    description: "Classic single-column flow optimized for parsing engines like Workday, Greenhouse, and Lever.",
    atsScore: 99,
    bestFor: "Enterprise & High-Volume Applications",
  },
  {
    id: "luxurious-grid",
    name: "Luxurious Dual-Column",
    badge: "Executive Favorite",
    description: "Balanced two-column architecture showcasing skills and competencies in a dedicated architectural rail.",
    atsScore: 96,
    bestFor: "Senior Roles & Design-Conscious Teams",
  },
  {
    id: "compact-engineer",
    name: "Compact Engineer (1-Page)",
    badge: "High Density",
    description: "Space-optimized layout with inline skill chips and dense metric-heavy experience bullets.",
    atsScore: 98,
    bestFor: "Software, Infrastructure & AI Engineers",
  },
];

export function ResumeInspectionGallery() {
  const [activeTemplate, setActiveTemplate] = useState<"modern-ats" | "luxurious-grid" | "compact-engineer">("modern-ats");

  const current = TEMPLATES.find((t) => t.id === activeTemplate) || TEMPLATES[0];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24" aria-label="Resume Template Inspection">
      <div className="border-b-2 border-[#10241c]/20 pb-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10241c] text-[#becbbf] text-xs font-black tracking-wide uppercase mb-3">
            <Layers className="w-3.5 h-3.5 text-[#becbbf]" />
            <span>Interactive Layout Gallery</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-[#10241c] tracking-tight">
            Tailored in 3 elite templates.
          </h2>
        </div>
        <p className="text-sm sm:text-base text-[#10241c] font-bold max-w-md">
          Export pixel-perfect PDF documents and ATS-clean text. Switch between templates in real time without losing a single fact or metric.
        </p>
      </div>

      {/* Template Selector Tabs */}
      <div className="flex flex-wrap gap-3 mb-8">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setActiveTemplate(tmpl.id)}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
              activeTemplate === tmpl.id
                ? "bg-[#10241c] text-white border-[#10241c] shadow-lg scale-[1.02]"
                : "bg-white/80 text-[#10241c] border-[#10241c]/25 hover:bg-white hover:border-[#10241c]"
            }`}
          >
            <span className="font-extrabold">{tmpl.name}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                activeTemplate === tmpl.id
                  ? "bg-[#becbbf] text-[#10241c]"
                  : "bg-[#10241c]/10 text-[#10241c]"
              }`}
            >
              {tmpl.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Main Interactive Showcase Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Template Meta & Feature Highlights */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-[#10241c]/20 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#10241c]/70 uppercase tracking-wider">ATS Score</span>
              <span className="px-2.5 py-1 rounded-full bg-[#10241c] text-white text-xs font-black">
                {current.atsScore}% Pass Rate
              </span>
            </div>
            <h3 className="text-2xl font-black text-[#10241c] tracking-tight">{current.name}</h3>
            <p className="text-sm text-[#10241c]/85 font-semibold leading-relaxed">
              {current.description}
            </p>

            <div className="pt-3 border-t border-[#10241c]/15 space-y-2 text-xs text-[#10241c] font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10241c]" />
                <span>Deterministic ATS Parsing Safe</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10241c]" />
                <span>100% Provenance-Backed Bullets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10241c]" />
                <span>One-Click PDF & Clean Text Export</span>
              </div>
            </div>

            <div className="pt-4">
              <SignUpButton mode="modal">
                <button className="w-full py-3 px-4 rounded-xl bg-[#10241c] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#0A0A66] transition-colors cursor-pointer">
                  <span>Use this layout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
            </div>
          </div>

          <div className="bg-[#10241c] text-white p-6 rounded-2xl border-2 border-[#10241c] shadow-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#becbbf] uppercase">
              <ShieldCheck className="w-4 h-4 text-[#becbbf]" />
              <span>Zero Hallucination Guarantee</span>
            </div>
            <h4 className="text-base font-extrabold leading-snug">
              Every detail is anchored to your Data Bank.
            </h4>
            <p className="text-xs text-[#becbbf] font-medium leading-relaxed">
              When recruiters inspect your resume, your claims hold up because every single achievement is backed by real work you actually performed.
            </p>
          </div>
        </div>

        {/* Right Column: Live Template Preview Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl border-2 border-[#10241c]/20 shadow-2xl p-6 sm:p-8 overflow-hidden min-h-[500px]">
          {/* Top Sheet Header */}
          <div className="border-b-2 border-[#10241c]/15 pb-5 mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#10241c] tracking-tight">ABHISHEK JOSE</h1>
              <p className="text-xs font-bold text-[#10241c]/70 mt-0.5">
                Full-Stack & AI Systems Engineer • Mumbai, India
              </p>
            </div>
            <div className="text-right text-[11px] font-bold text-[#10241c]/80 space-y-0.5">
              <div>abhishekjose780@gmail.com</div>
              <div>github.com/Abhishek-Jose7</div>
            </div>
          </div>

          {/* Conditional Layout Preview Body */}
          {activeTemplate === "modern-ats" && (
            <div className="space-y-6 text-left">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#10241c] border-b border-[#10241c]/20 pb-1 mb-2">
                  Technical Skills
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div><strong className="text-[#10241c]">Cloud & Deployment:</strong> Cloudflare Workers, D1, Vercel, Firebase</div>
                  <div><strong className="text-[#10241c]">Languages:</strong> Python, TypeScript, JavaScript, SQL, C, Dart</div>
                  <div><strong className="text-[#10241c]">AI & GenAI:</strong> Generative AI, LLMs, RAG, AI Agents, Embeddings</div>
                  <div><strong className="text-[#10241c]">Web & Backend:</strong> React, Next.js, Flask, Django, Tailwind CSS, REST APIs</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#10241c] border-b border-[#10241c]/20 pb-1 mb-2">
                  Professional Experience
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline text-xs font-bold text-[#10241c]">
                      <span className="font-extrabold text-sm">Technical Lead • GDG CRCE</span>
                      <span>May 2026 — Present</span>
                    </div>
                    <ul className="list-disc list-inside mt-1 text-xs text-[#10241c]/85 space-y-1 font-medium">
                      <li>Managing technical initiatives and event execution supporting 1,500+ participants and 680+ teams.</li>
                      <li>Architected web infrastructure for Bit n Build hackathon with real-time QR verification and leaderboards.</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-bold text-[#10241c]">
                      <span className="font-extrabold text-sm">Technical Intern • FRCRCE Bandra</span>
                      <span>July 2026 — Present</span>
                    </div>
                    <ul className="list-disc list-inside mt-1 text-xs text-[#10241c]/85 space-y-1 font-medium">
                      <li>Engineered an edge-native curriculum management platform using Next.js, Cloudflare Workers, D1, and R2.</li>
                      <li>Automated high-throughput PDF generation pipeline powered by headless Chromium on cloud queues.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#10241c] border-b border-[#10241c]/20 pb-1 mb-2">
                  Selected Projects
                </h4>
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="font-extrabold text-[#10241c]">Hangout — Group Itinerary Planner</span>
                    <span className="text-[#10241c]/60 ml-2">(Next.js, Cloudflare D1, Groq, Python)</span>
                    <p className="text-[#10241c]/85 font-medium mt-0.5">
                      Built a collaborative group trip planner optimizing multi-location itinerary constraints to generate personalized outings within free-tier cloud limits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTemplate === "luxurious-grid" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
              {/* Left Column Rail */}
              <div className="md:col-span-4 border-r-0 md:border-r border-[#10241c]/15 md:pr-5 space-y-5">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#10241c] mb-2">Core Competencies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#10241c] text-white text-[10px] font-bold">RAG Systems</span>
                    <span className="px-2 py-0.5 rounded bg-[#10241c] text-white text-[10px] font-bold">Cloudflare Workers</span>
                    <span className="px-2 py-0.5 rounded bg-[#10241c] text-white text-[10px] font-bold">Next.js & Prisma</span>
                    <span className="px-2 py-0.5 rounded bg-[#10241c] text-white text-[10px] font-bold">Distributed Systems</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#10241c] mb-2">Education</h4>
                  <div className="text-xs text-[#10241c]">
                    <div className="font-bold">B.E. Computer Engineering</div>
                    <div className="text-[11px] text-[#10241c]/70">Fr. CRCE, Mumbai • 2028</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#10241c] mb-2">Awards & Honors</h4>
                  <div className="text-xs text-[#10241c] font-semibold space-y-1">
                    <div>• 2x Hackathon Winner [PKP Hacks]</div>
                    <div>• Supervised ML Specialization</div>
                  </div>
                </div>
              </div>

              {/* Right Column Main */}
              <div className="md:col-span-8 space-y-5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#10241c] border-b border-[#10241c]/20 pb-1 mb-2">
                    Professional Experience
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-baseline text-xs font-bold text-[#10241c]">
                        <span className="font-extrabold text-sm">Technical Lead • GDG CRCE</span>
                        <span>May 2026 — Present</span>
                      </div>
                      <p className="text-xs text-[#10241c]/85 font-medium mt-1 leading-relaxed">
                        Directing technical execution across council events, orchestrating registration and leaderboard infrastructure for 1,500+ participants.
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline text-xs font-bold text-[#10241c]">
                        <span className="font-extrabold text-sm">Technical Intern • FRCRCE Bandra</span>
                        <span>July 2026 — Present</span>
                      </div>
                      <p className="text-xs text-[#10241c]/85 font-medium mt-1 leading-relaxed">
                        Engineered edge-native platform with Next.js, Cloudflare Workers, and D1 for automated syllabus authoring and PDF generation.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#10241c] border-b border-[#10241c]/20 pb-1 mb-2">
                    Key Projects
                  </h4>
                  <div className="text-xs text-[#10241c] space-y-1.5 font-medium">
                    <p><strong className="font-bold text-[#10241c]">Nyaaya AI:</strong> Legal guidance platform with scenario-based RAG workflows.</p>
                    <p><strong className="font-bold text-[#10241c]">KrishiMitra AI:</strong> Full-stack farmer decision system with ML price forecasting.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTemplate === "compact-engineer" && (
            <div className="space-y-4 text-left font-mono text-xs">
              <div className="p-2.5 rounded bg-[#10241c]/5 border border-[#10241c]/20 text-[11px] leading-relaxed">
                <span className="font-bold text-[#10241c] uppercase block mb-1 font-sans">Skills Matrix:</span>
                Cloudflare Workers | D1 | Vercel | Python | TypeScript | Next.js | React | PostgreSQL | SQLite | RAG | LLMs | Scikit-learn
              </div>

              <div>
                <span className="font-bold text-[#10241c] uppercase block mb-1.5 border-b border-[#10241c]/20 pb-0.5 font-sans">
                  Engineering Roles:
                </span>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[#10241c]">
                      <span>Technical Lead @ GDG CRCE</span>
                      <span>2026 — PRESENT</span>
                    </div>
                    <div className="text-[11px] text-[#10241c]/90 mt-0.5">
                      • Managed full-cycle technical deployment for Bit n Build hackathon; scaled platform to 1,500+ participants and 680+ teams.
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[#10241c]">
                      <span>Technical Intern @ FRCRCE Bandra</span>
                      <span>2026 — PRESENT</span>
                    </div>
                    <div className="text-[11px] text-[#10241c]/90 mt-0.5">
                      • Engineered serverless platform using Next.js, Cloudflare Workers, D1, R2, and headless Chromium for automated PDF generation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
