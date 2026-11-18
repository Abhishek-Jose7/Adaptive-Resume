"use client";

import React from "react";
import { UsageLimitsDashboard } from "@/components/usage/UsageLimitsDashboard";
import { DollarSign, ShieldCheck, Key, Zap } from "lucide-react";
import Link from "next/link";

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Free-Tier Quotas &amp; Usage</h1>
        <p className="text-sm text-gray-400 mt-1">
          Honest accounting of all monthly AI generations, exports, and database records under our \$0 cost pledge.
        </p>
      </div>

      <UsageLimitsDashboard />

      {/* Free Tier Guarantee Box */}
      <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-3 text-xs text-gray-300">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Our Transparent \$0 Spend Guarantee (PRD Section 18.9)
        </h3>
        <p>
          Resume Maker was designed from the ground up to never require a credit card, paid monthly subscription, or surprise usage-based billing.
          All client-side operations (DOCX export, PDF generation, ATS scanning) run directly in your browser.
        </p>
        <p>
          Need to generate 100+ tailored resumes? Simply configure your own free Gemini API key (which includes 15 requests per minute completely free) or Groq API key in the{" "}
          <Link href="/settings/providers" className="text-blue-400 hover:underline font-semibold">
            BYOK Provider Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
