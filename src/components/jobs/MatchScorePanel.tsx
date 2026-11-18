"use client";

import React, { useState, useEffect } from "react";
import { Gauge, CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronRight, HelpCircle, Layers, ArrowUpRight } from "lucide-react";
import { MatchScoreBreakdown } from "@/lib/scoring/matchScoreEngine";
import { GapReport } from "@/lib/scoring/gapReportEngine";

interface Props {
  jobId: string;
}

export function MatchScorePanel({ jobId }: Props) {
  const [loading, setLoading] = useState(false);
  const [matchScore, setMatchScore] = useState<MatchScoreBreakdown | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
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
      setMatchScore(json.data.matchScore);
      setGapReport(json.data.gapReport);
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
      <div className="bg-white border rounded-xl p-6 text-center text-gray-500 text-sm">
        Calculating Resume–JD Match Score and evaluating skill gaps...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button
          onClick={fetchScoreAndGaps}
          className="text-xs text-indigo-600 font-semibold hover:underline"
        >
          Retry calculation
        </button>
      </div>
    );
  }

  if (!matchScore) return null;

  const scoreColor =
    matchScore.totalScore >= 75
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : matchScore.totalScore >= 50
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
      {/* Header & Score Gauge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Resume–JD Match Score</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
              v{matchScore.scoringVersion}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Internal compatibility estimate based on grounded evidence in your Data Bank. This is not an employer ATS prediction.
          </p>
        </div>

        {matchScore.isAvailable ? (
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${scoreColor}`}>
            <span className="text-3xl font-extrabold">{matchScore.totalScore}</span>
            <span className="text-xs font-semibold uppercase tracking-wider">/ 100</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800">
            {matchScore.unavailableReason}
          </div>
        )}
      </div>

      {/* 7-Dimension Breakdown Accordion */}
      {matchScore.isAvailable && (
        <div className="space-y-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {showBreakdown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {showBreakdown ? "Hide Score Breakdown" : "View 7-Dimension Score Breakdown"}
          </button>

          {showBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Must-Have Keywords (Weight: 30)</span>
                  <span className="font-bold">{matchScore.dimensions.mustHaveKeywords.score} / 30</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{ width: `${(matchScore.dimensions.mustHaveKeywords.score / 30) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500">
                  Covered: {matchScore.dimensions.mustHaveKeywords.covered.join(", ") || "None"}
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Nice-to-Have Keywords (Weight: 10)</span>
                  <span className="font-bold">{matchScore.dimensions.niceToHaveKeywords.score} / 10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{ width: `${(matchScore.dimensions.niceToHaveKeywords.score / 10) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500">
                  Covered: {matchScore.dimensions.niceToHaveKeywords.covered.join(", ") || "None"}
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Relevant Achievements (Weight: 20)</span>
                  <span className="font-bold">{matchScore.dimensions.relevantAchievements.score} / 20</span>
                </div>
                <p className="text-[11px] text-gray-500">{matchScore.dimensions.relevantAchievements.details}</p>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Responsibility Alignment (Weight: 15)</span>
                  <span className="font-bold">{matchScore.dimensions.responsibilityAlignment.score} / 15</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {matchScore.dimensions.responsibilityAlignment.matchedCount} of{" "}
                  {matchScore.dimensions.responsibilityAlignment.totalCount} responsibilities aligned
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Seniority Alignment (Weight: 10)</span>
                  <span className="font-bold">{matchScore.dimensions.experienceSeniority.score} / 10</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Candidate: {matchScore.dimensions.experienceSeniority.candidateSeniority} • Required:{" "}
                  {matchScore.dimensions.experienceSeniority.requiredSeniority}
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Parseability & Formatting (Weight: 10)</span>
                  <span className="font-bold">{matchScore.dimensions.parseabilityFormatting.score} / 10</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {matchScore.dimensions.parseabilityFormatting.passFlags.join(" • ")}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis Panels */}
      {gapReport && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            Requirement Gap Analysis ({gapReport.totalMissingCount} Uncovered Requirements)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category A: In Data Bank, Not on Resume */}
            <div className="border rounded-lg p-4 bg-blue-50/30 border-blue-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                In Data Bank (Not on current resume)
              </div>
              <p className="text-[11px] text-gray-600">
                You have verified evidence for these in your Data Bank. Add them to your resume to increase your score.
              </p>
              <div className="space-y-1.5 pt-1">
                {gapReport.inBankNotOnResume.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">None</p>
                ) : (
                  gapReport.inBankNotOnResume.map((item) => (
                    <div key={item.keyword.canonical} className="bg-white p-2 rounded border border-blue-100 text-xs">
                      <span className="font-semibold text-blue-800">{item.keyword.canonical}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.recommendedAction}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category B: In Profile, Unverified */}
            <div className="border rounded-lg p-4 bg-amber-50/30 border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                In Profile (Unverified)
              </div>
              <p className="text-[11px] text-gray-600">
                Listed in your profile or contexts, but lacks quantified achievement bullets.
              </p>
              <div className="space-y-1.5 pt-1">
                {gapReport.inProfileUnverified.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">None</p>
                ) : (
                  gapReport.inProfileUnverified.map((item) => (
                    <div key={item.keyword.canonical} className="bg-white p-2 rounded border border-amber-100 text-xs">
                      <span className="font-semibold text-amber-800">{item.keyword.canonical}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.recommendedAction}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category C: Missing from Bank */}
            <div className="border rounded-lg p-4 bg-rose-50/30 border-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <XCircle className="w-4 h-4 text-rose-600" />
                Not in your Data Bank — add only if true
              </div>
              <p className="text-[11px] text-gray-600">
                Candidate lacks evidenced experience. The AI will never hallucinate or invent these.
              </p>
              <div className="space-y-1.5 pt-1">
                {gapReport.missingFromBank.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">None</p>
                ) : (
                  gapReport.missingFromBank.map((item) => (
                    <div key={item.keyword.canonical} className="bg-white p-2 rounded border border-rose-100 text-xs">
                      <span className="font-semibold text-rose-800">{item.keyword.canonical}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.recommendedAction}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
