"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MatchScoreBreakdown } from "@/lib/scoring/matchScoreEngine";
import { GapReport } from "@/lib/scoring/gapReportEngine";

interface Props {
  jobId: string;
}

export function MatchScorePanel({ jobId }: Props) {
  const [loading, setLoading] = useState(false);
  const [matchScore, setMatchScore] = useState<MatchScoreBreakdown | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScoreAndGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/match-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to calculate match score");
      }

      const json = await res.json();
      const payload = json?.data ?? json;
      setMatchScore(payload.matchScore);
      setGapReport(payload.gapReport);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchScoreAndGaps();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="panel px-5 py-6 text-[13px] text-graphite">
        Measuring the resume against the posting
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel px-5 py-6">
        <p className="text-[13px] text-alarm">{error}</p>
        <button onClick={fetchScoreAndGaps} className="btn btn-sm mt-3">
          Try again
        </button>
      </div>
    );
  }

  if (!matchScore) return null;

  const band =
    matchScore.totalScore >= 75
      ? { color: "text-press", bar: "var(--press)", label: "strong match" }
      : matchScore.totalScore >= 50
        ? { color: "text-marker-dark", bar: "var(--marker)", label: "partial match" }
        : { color: "text-alarm", bar: "var(--alarm)", label: "weak match" };

  const rows = [
    {
      label: "Must-have keywords",
      weight: 30,
      score: matchScore.dimensions.mustHaveKeywords.score,
      detail: `Covered: ${matchScore.dimensions.mustHaveKeywords.covered.join(", ") || "none"}`,
    },
    {
      label: "Relevant achievements",
      weight: 20,
      score: matchScore.dimensions.relevantAchievements.score,
      detail: matchScore.dimensions.relevantAchievements.details,
    },
    {
      label: "Responsibility alignment",
      weight: 15,
      score: matchScore.dimensions.responsibilityAlignment.score,
      detail: `${matchScore.dimensions.responsibilityAlignment.matchedCount} of ${matchScore.dimensions.responsibilityAlignment.totalCount} responsibilities aligned`,
    },
    {
      label: "Nice-to-have keywords",
      weight: 10,
      score: matchScore.dimensions.niceToHaveKeywords.score,
      detail: `Covered: ${matchScore.dimensions.niceToHaveKeywords.covered.join(", ") || "none"}`,
    },
    {
      label: "Seniority alignment",
      weight: 10,
      score: matchScore.dimensions.experienceSeniority.score,
      detail: `Candidate ${matchScore.dimensions.experienceSeniority.candidateSeniority}, required ${matchScore.dimensions.experienceSeniority.requiredSeniority}`,
    },
    {
      label: "Skills evidence & recency",
      weight: 5,
      score: matchScore.dimensions.skillsEvidenceRecency.score,
      detail: `${matchScore.dimensions.skillsEvidenceRecency.recentEvidencedSkillsCount} skill entries in resume`,
    },
    {
      label: "Parseability and formatting",
      weight: 10,
      score: matchScore.dimensions.parseabilityFormatting.score,
      detail: matchScore.dimensions.parseabilityFormatting.passFlags.join(", "),
    },
  ];

  const gapGroups = [
    {
      title: "In the bank, not on the resume",
      note: "Evidence exists. Adding it is an edit, not a claim.",
      items: gapReport?.inBankNotOnResume ?? [],
      accent: "border-l-0 text-press",
    },
    {
      title: "In the profile, unverified",
      note: "Mentioned somewhere, but no bullet carries it.",
      items: gapReport?.inProfileUnverified ?? [],
      accent: "text-marker-dark",
    },
    {
      title: "Not in the bank",
      note: "Absent from your record. Add it only if it is true.",
      items: gapReport?.missingFromBank ?? [],
      accent: "text-alarm",
    },
  ];

  return (
    <section className="panel">
      <div className="flex flex-col gap-3 border-b border-rule px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">Match score</h3>
          <p className="mt-1 max-w-[52ch] text-[12px] leading-relaxed text-graphite">
            An estimate against your own evidence, not a prediction of an employer&apos;s parser.
          </p>
        </div>

        {matchScore.isAvailable ? (
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-[42px] font-semibold leading-none tracking-tightest ${band.color}`}>
              {matchScore.totalScore}
            </span>
            <span className="font-mono text-[11px] text-graphite">/ 100 · {band.label}</span>
          </div>
        ) : (
          <p className="border border-marker/35 bg-marker-soft px-2.5 py-1 text-[11.5px] text-marker-dark">
            {matchScore.unavailableReason}
          </p>
        )}
      </div>

      {matchScore.isAvailable && (
        <div>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex w-full items-center gap-1.5 border-b border-rule px-4 py-2 text-[12px] text-graphite hover:text-ink sm:px-5"
          >
            {showBreakdown ? (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
            {showBreakdown ? "Hide the seven dimensions" : "Show the seven dimensions"}
            <span className="ml-auto font-mono text-[10.5px]">v{matchScore.scoringVersion}</span>
          </button>

          {showBreakdown && (
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-rule">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="w-[38%] px-4 py-2.5 align-top sm:px-5">
                      <div className="font-medium">{row.label}</div>
                      <div className="mt-0.5 text-[11px] leading-relaxed text-graphite">{row.detail}</div>
                    </td>
                    <td className="w-[42%] px-2 py-3 align-middle">
                      <div className="meter">
                        <span
                          style={{
                            width: `${(row.score / row.weight) * 100}%`,
                            backgroundColor: band.bar,
                          }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right align-top font-mono text-[11.5px] text-graphite sm:px-5">
                      {row.score} / {row.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {gapReport && (
        <div className="border-t border-rule px-4 py-4 sm:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-[13px] font-semibold">Requirement gaps</h4>
            <span className="folio">{gapReport.totalMissingCount} uncovered</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
            {gapGroups.map((group) => (
              <div key={group.title}>
                <p className={`border-t border-ink pt-2 text-[12.5px] font-semibold ${group.accent}`}>
                  {group.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-graphite">{group.note}</p>

                <ul className="mt-2 space-y-2">
                  {group.items.length === 0 ? (
                    <li className="text-[12px] text-graphite">Nothing here</li>
                  ) : (
                    group.items.map((item) => (
                      <li key={item.keyword.canonical} className="border-t border-rule pt-1.5">
                        <span className="text-[12.5px] font-medium">{item.keyword.canonical}</span>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-graphite">
                          {item.recommendedAction}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
