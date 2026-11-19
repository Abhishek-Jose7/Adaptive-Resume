import React from "react";
import { BulletFact } from "@/types/bank";
import { CheckCircle } from "lucide-react";

export function FactBadge({ fact }: { fact: BulletFact }) {
  const isMetric = fact.factType === "metric";
  const isOutcome = fact.factType === "outcome";

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10.5px] ${
        isMetric
          ? "border-press/30 bg-press-soft text-press"
          : isOutcome
            ? "border-marker/35 bg-marker-soft text-marker-dark"
            : "border-rule bg-paper-alt text-graphite"
      }`}
      title={`${fact.factKey}: ${fact.valueText}`}
    >
      <span className="opacity-70">{fact.factKey}</span>
      <span className="font-medium">{fact.valueText}</span>
      {fact.verificationStatus === "user_verified" && (
        <CheckCircle className="h-2.5 w-2.5" strokeWidth={2.2} aria-label="user verified" />
      )}
    </span>
  );
}
