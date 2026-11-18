import React from "react";
import { CompletenessReport } from "@/types/bank";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export function CompletenessWarning({ report }: { report?: CompletenessReport }) {
  if (!report) return null;

  const totalGaps =
    report.missingMetricBulletIds.length +
    report.missingDateEntryIds.length +
    report.unevidencedSkillGroupIds.length;

  if (totalGaps === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-medium">
          Data Bank Health: Excellent! All entries have dates and bullets contain quantifiable metrics.
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span>Data Bank Health Check ({totalGaps} potential gaps found):</span>
      </div>
      <ul className="list-disc pl-5 space-y-0.5 text-amber-800/90">
        {report.missingMetricBulletIds.length > 0 && (
          <li>
            <strong>{report.missingMetricBulletIds.length} bullets</strong> lack quantifiable metrics or impact numbers. Adding numbers dramatically improves ATS score.
          </li>
        )}
        {report.missingDateEntryIds.length > 0 && (
          <li>
            <strong>{report.missingDateEntryIds.length} entries</strong> are missing dates. Experience entries need dates for accurate seniority calculations.
          </li>
        )}
        {report.unevidencedSkillGroupIds.length > 0 && (
          <li>
            <strong>{report.unevidencedSkillGroupIds.length} skill groups</strong> lack supporting evidence in your achievement bullets.
          </li>
        )}
      </ul>
    </div>
  );
}
