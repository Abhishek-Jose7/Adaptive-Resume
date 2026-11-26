"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, ArrowRight, Sparkles, Building2, Briefcase } from "lucide-react";

interface Scenario {
  id: string;
  category: string;
  fromRole: string;
  toRole: string;
  company: string;
  matchScore: number;
  jobRequirement: string;
  bankBullet: string;
  tailoredBullet: string;
  skills: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "cs-to-csm",
    category: "Customer Success",
    fromRole: "Customer Support Specialist",
    toRole: "Customer Success Manager",
    company: "SaaS Scaleup",
    matchScore: 94,
    jobRequirement: "Drive proactive customer onboarding, reduce time-to-value, and partner directly with product teams to eliminate recurring churn drivers.",
    bankBullet: "Wrote customer troubleshooting guide and regularly relayed onboarding friction points to engineering and product teams.",
    tailoredBullet: "Spearheaded customer onboarding optimization by developing structured playbooks that decreased time-to-first-value by 32% while synthesizing recurring user pain points into bi-weekly product enhancement roadmaps.",
    skills: ["Client Onboarding", "Churn Mitigation", "Cross-Functional Alignment", "Time-to-Value"],
  },
  {
    id: "swe-to-ai",
    category: "AI & GenAI",
    fromRole: "Full-Stack Developer",
    toRole: "AI Systems Engineer",
    company: "Autonomous AI Lab",
    matchScore: 96,
    jobRequirement: "Architect high-throughput RAG pipelines, manage vector databases, and implement deterministic fallback safeguards for LLM outputs.",
    bankBullet: "Built hackathon app using Next.js, Groq API, and Supabase vector embeddings with fallback prompt routines.",
    tailoredBullet: "Architected production-ready RAG ingestion pipelines utilizing pgvector and hybrid keyword search, cutting hallucination rates to <0.8% with sub-250ms deterministic fallback failovers.",
    skills: ["RAG Pipelines", "Vector Search", "LLM Guardrails", "Sub-250ms Latency"],
  },
  {
    id: "da-to-pm",
    category: "Product Management",
    fromRole: "Data Analyst",
    toRole: "Growth Product Manager",
    company: "Fintech Enterprise",
    matchScore: 91,
    jobRequirement: "Own the end-to-end conversion funnel, run hypothesis-driven A/B experiments, and lead sprint prioritization for user acquisition.",
    bankBullet: "Analyzed checkout funnel dropoffs and shared dashboard insights with senior marketing and product leadership.",
    tailoredBullet: "Led growth experimentation across the core checkout funnel by formulating 18+ A/B hypotheses that improved checkout completion by 24.5% and unlocked $1.4M in annualized pipeline value.",
    skills: ["Funnel Optimization", "A/B Hypothesis Testing", "Sprint Prioritization", "Revenue Impact"],
  },
  {
    id: "ops-to-bizops",
    category: "Business Operations",
    fromRole: "Operations Coordinator",
    toRole: "Strategic BizOps Associate",
    company: "Global Logistics Co.",
    matchScore: 93,
    jobRequirement: "Streamline multi-market operational workflows, establish centralized KPI reporting, and eliminate operational bottlenecks.",
    bankBullet: "Coordinated logistics schedules across 4 regional warehouses and tracked weekly SLA metrics in spreadsheets.",
    tailoredBullet: "Consolidated multi-region logistics operations into automated KPI telemetry tracking 4 regional hubs, slashing SLA delivery discrepancies by 41% across 12,000+ monthly shipments.",
    skills: ["Process Automation", "SLA Governance", "KPI Telemetry", "Supply Chain Scalability"],
  },
];

export function TransformationCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SCENARIOS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const active = SCENARIOS[activeIdx];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + SCENARIOS.length) % SCENARIOS.length);
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % SCENARIOS.length);
  };

  return (
    <section
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      aria-label="Real-life transformation gallery"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10241c] text-[#becbbf] text-xs font-bold tracking-wide uppercase mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#becbbf]" />
          <span>Interactive Transformation Showcase</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#10241c] tracking-tight leading-tight">
          How your experience travels into new roles.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-[#10241c]/80 leading-relaxed font-medium">
          Every career pivot begins with facts you already possess. Watch how Adaptive Resume translates raw experience into high-impact, role-specific qualifications.
        </p>

        {/* Scenario Selectors */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-8">
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => setActiveIdx(i)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeIdx === i
                  ? "bg-[#10241c] text-white shadow-md scale-105"
                  : "bg-white/80 text-[#10241c] hover:bg-white border border-[#10241c]/20"
              }`}
            >
              {sc.category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Showcase Card */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-[#10241c]/20 overflow-hidden transition-all duration-300">
        {/* Top Meta Bar */}
        <div className="bg-[#10241c] text-white px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-white/10 text-[#becbbf]">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-[#becbbf] uppercase tracking-wider font-semibold">Career Pivot</div>
              <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{active.fromRole}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#becbbf]" />
                <span className="text-white underline decoration-[#becbbf]">{active.toRole}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-[#becbbf]">
              <Building2 className="w-3.5 h-3.5" />
              <span>{active.company}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-[#becbbf] text-[#10241c] text-xs font-extrabold tracking-wide">
              {active.matchScore}% Match
            </div>
          </div>
        </div>

        {/* 3-Stage Transformation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#10241c]/10 p-5 sm:p-8 gap-6 sm:gap-8">
          {/* Stage 1: Role Requirement */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10241c]/5 text-[#10241c] text-xs font-bold uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-[#10241c]" />
                1. What The Job Asks
              </div>
              <h3 className="text-lg font-bold text-[#10241c] mb-2">{active.toRole}</h3>
              <p className="text-sm text-[#10241c]/80 leading-relaxed font-normal bg-[#becbbf]/15 p-4 rounded-xl border border-[#10241c]/10">
                &ldquo;{active.jobRequirement}&rdquo;
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#10241c]/10">
              <span className="text-xs font-semibold text-[#10241c]/60 uppercase tracking-wide">Target Core Needs</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {active.skills.slice(0, 2).map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#10241c]/5 text-[#10241c]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stage 2: Saved Raw Career History */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#becbbf]/30 text-[#10241c] text-xs font-bold uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-[#becbbf]" />
                2. In Your Private Data Bank
              </div>
              <h3 className="text-lg font-bold text-[#10241c] mb-2">{active.fromRole}</h3>
              <div className="text-sm text-[#10241c]/80 leading-relaxed bg-[#F7F9F8] p-4 rounded-xl border border-dashed border-[#10241c]/20">
                <div className="font-semibold text-xs text-[#10241c]/60 mb-1">Your authentic entry:</div>
                &ldquo;{active.bankBullet}&rdquo;
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#10241c]/10">
              <span className="text-xs font-semibold text-[#10241c]/60 uppercase tracking-wide">Verification Anchor</span>
              <div className="text-xs font-bold text-[#10241c] mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10241c]" />
                <span>Zero hallucination — grounded in truth</span>
              </div>
            </div>
          </div>

          {/* Stage 3: Synthesized Resume Output */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10241c] text-[#becbbf] text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3 h-3 text-[#becbbf]" />
                3. Tailored Resume Draft
              </div>
              <h3 className="text-lg font-bold text-[#10241c] mb-2">Ready For Review</h3>
              <div className="text-sm text-[#10241c] font-medium leading-relaxed bg-[#becbbf]/25 p-4 rounded-xl border-2 border-[#10241c]/20 shadow-sm">
                &ldquo;{active.tailoredBullet}&rdquo;
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#10241c]/10">
              <span className="text-xs font-semibold text-[#10241c]/60 uppercase tracking-wide">ATS & Recruiter Impact</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {active.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#10241c] text-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Carousel Controls */}
        <div className="bg-[#becbbf]/20 px-6 py-4 flex items-center justify-between border-t border-[#10241c]/10">
          <div className="flex items-center gap-2">
            {SCENARIOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-200 ${
                  activeIdx === i ? "w-8 bg-[#10241c]" : "w-2 bg-[#10241c]/30 hover:bg-[#10241c]/50"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous scenario"
              className="p-2 rounded-lg bg-white border border-[#10241c]/20 text-[#10241c] hover:bg-[#10241c] hover:text-white transition-colors cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#10241c] px-2">
              {activeIdx + 1} / {SCENARIOS.length}
            </span>
            <button
              onClick={handleNext}
              aria-label="Next scenario"
              className="p-2 rounded-lg bg-white border border-[#10241c]/20 text-[#10241c] hover:bg-[#10241c] hover:text-white transition-colors cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
