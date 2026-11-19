import React from "react";
import { CompletenessReport } from "@/types/bank";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function CompletenessWarning({ report }: { report?: CompletenessReport }) {
  if (!report) return null;

  const totalGaps =
    report.missingMetricBulletIds.length +
    report.missingDateEntryIds.length +
    report.unevidencedSkillGroupIds.length;

  if (totalGaps === 0) {
    return (
      <div className="flex items-start gap-2 border border-press/30 bg-press-soft px-3 py-2 text-[12.5px] text-press">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span>Everything has a date, and every bullet carries a measurable result.</span>
      </div>
    );
  }

  return (
    <div className="border border-marker/35 bg-marker-soft px-3 py-2.5">
      <div className="flex items-start gap-2 text-[12.5px] font-medium text-marker-dark">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span>{totalGaps} things a parser will notice</span>
      </div>

      <ul className="mt-1.5 space-y-0.5 pl-[22px] text-[12px] leading-relaxed text-marker-dark/90">
        {report.missingMetricBulletIds.length > 0 && (
          <li>
            {report.missingMetricBulletIds.length} bullets have no number — recall is what a reader
            remembers.
          </li>
        )}
        {report.missingDateEntryIds.length > 0 && (
          <li>
            {report.missingDateEntryIds.length} entries have no dates, so tenure cannot be calculated.
          </li>
        )}
        {report.unevidencedSkillGroupIds.length > 0 && (
          <li>
            {report.unevidencedSkillGroupIds.length} skill groups are listed without a bullet that proves
            them.
          </li>
        )}
      </ul>
    </div>
  );
}
