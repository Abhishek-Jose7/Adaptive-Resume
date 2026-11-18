"use client";

import React, { useState } from "react";
import { Sparkles, Check, X, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { TailoredBulletResult, AiRunDetails } from "@/lib/services/tailoringService";

interface Props {
  jobId: string;
  onAccepted?: (bullet: TailoredBulletResult) => void;
}

export function TailoringReviewPanel({ jobId, onAccepted }: Props) {
  const [running, setRunning] = useState(false);
  const [runDetails, setRunDetails] = useState<AiRunDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartTailoring = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "local-deterministic" }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to start AI tailoring run");
      }

      const json = await res.json();
      setRunDetails(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleAcceptItem = async (bulletId: string) => {
    if (!runDetails) return;
    try {
      const res = await fetch(`/api/v1/ai-runs/${runDetails.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletId }),
      });
      if (res.ok) {
        const json = await res.json();
        setRunDetails(json.data);
        const acceptedItem = json.data.results.find((r: TailoredBulletResult) => r.bulletId === bulletId);
        if (acceptedItem && onAccepted) {
          onAccepted(acceptedItem);
        }
      }
    } catch (err: any) {
      console.error("Accept failed:", err);
    }
  };

  const handleRejectItem = async (bulletId: string) => {
    if (!runDetails) return;
    try {
      const res = await fetch(`/api/v1/ai-runs/${runDetails.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletId }),
      });
      if (res.ok) {
        const json = await res.json();
        setRunDetails(json.data);
      }
    } catch (err: any) {
      console.error("Reject failed:", err);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Truth-Bound AI Tailoring & Candidate Ranking
          </h3>
          <p className="text-sm text-gray-600">
            Scores candidate bullets against JD requirements and applies strict Section 10.4 truth validation. Zero hallucinations guaranteed.
          </p>
        </div>

        <button
          onClick={handleStartTailoring}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 text-sm"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Tailoring & Validating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Truth-Bound Rewrites
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {runDetails && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
            <div>
              <span className="font-semibold text-gray-700">Provider:</span> {runDetails.provider} ({runDetails.model})
            </div>
            <div>
              <span className="font-semibold text-gray-700">Run ID:</span> {runDetails.id.slice(0, 8)}...
            </div>
            <div>
              <span className="font-semibold text-gray-700">Candidates Evaluated:</span> {runDetails.results.length}
            </div>
          </div>

          <div className="space-y-4">
            {runDetails.results.map((item, idx) => (
              <div
                key={item.bulletId}
                className={`border rounded-lg p-4 transition-all ${
                  item.status === "accepted"
                    ? "bg-green-50/50 border-green-300"
                    : item.status === "rejected"
                    ? "bg-gray-50 border-gray-200 opacity-60"
                    : "bg-white border-gray-200 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Candidate #{idx + 1}
                    </span>
                    {item.validatorStatus === "passed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <ShieldCheck className="w-3.5 h-3.5" /> Truth-Validated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" /> Retained Original (Zero Hallucination Fallback)
                      </span>
                    )}

                    {item.retryCount > 0 && (
                      <span className="text-xs text-gray-500">
                        (Repaired via {item.retryCount} retry)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "accepted" ? (
                      <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Accepted
                      </span>
                    ) : item.status === "rejected" ? (
                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <X className="w-4 h-4" /> Rejected
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAcceptItem(item.bulletId)}
                          className="px-2.5 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleRejectItem(item.bulletId)}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 rounded flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-0.5">Original Source:</span>
                    <p className="text-gray-600 bg-gray-50 p-2 rounded text-xs">{item.originalText}</p>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-indigo-600 block mb-0.5">Proposed Rewrite & Alignment:</span>
                    <div
                      className="text-gray-900 bg-indigo-50/40 p-2.5 rounded border border-indigo-100 text-sm font-medium"
                      dangerouslySetInnerHTML={{ __html: item.diffHtml || item.rewrittenText }}
                    />
                  </div>

                  {item.validationNotes && item.validationNotes.length > 0 && (
                    <div className="text-xs text-gray-500 italic pt-1">
                      {item.validationNotes.join(" • ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
