"use client";

import React from "react";
import { UsageLimitsDashboard } from "@/components/usage/UsageLimitsDashboard";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function UsagePage() {
  return (
    <div>
      <header className="mb-6 border-b border-rule pb-5">
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
          Your usage
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
          What this month has cost you, and what is left. No card on file, no trial that quietly ends.
        </p>
      </header>

      <UsageLimitsDashboard />

      <section className="panel mt-4 px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4 text-press" strokeWidth={1.8} />
          Why the limits exist
        </h3>
        <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-graphite">
          See what you’ve used this month and what’s available. Resume drafts that use an AI service count toward your monthly limit.
        </p>
        <Link
          href="/settings/providers"
          className="mt-2 inline-block text-[13px] font-medium text-stamp underline decoration-rule underline-offset-2 hover:decoration-stamp"
        >
          View AI settings
        </Link>
      </section>
    </div>
  );
}
