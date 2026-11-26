"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Users,
  Wrench,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { QuantificationQuestion } from "@/types/bank";

interface QuantificationAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  bulletId: string;
  initialText: string;
  context?: string;
  onBulletUpdated?: () => void;
}

export function QuantificationAssistantModal({
  isOpen,
  onClose,
  entryId,
  bulletId,
  initialText,
  context,
  onBulletUpdated,
}: QuantificationAssistantModalProps) {
  const [questions, setQuestions] = useState<QuantificationQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Form states for answering the currently active question
  const [userResponse, setUserResponse] = useState("");
  const [metricEstimate, setMetricEstimate] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const generateQuestions = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/quantification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          text: initialText,
          context,
          bulletId,
          entryId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setQuestions(
          items.map((q: any) => ({
            ...q,
            isAnswered: q.isAnswered ?? q.status === "answered",
          }))
        );
        setActiveQuestionIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [initialText, context, bulletId, entryId]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/quantification?bulletId=${bulletId}&entryId=${entryId}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        if (items.length > 0) {
          setQuestions(
            items.map((q: any) => ({
              ...q,
              isAnswered: q.isAnswered ?? q.status === "answered",
            }))
          );
        } else {
          await generateQuestions();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bulletId, entryId, generateQuestions]);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen, bulletId, loadQuestions]);

  if (!isOpen) return null;

  const currentQ = questions[activeQuestionIndex];

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQ || !userResponse.trim()) return;

    setSubmittingAnswer(true);
    const numericEstimate = metricEstimate.trim() ? Number(metricEstimate.trim()) : undefined;
    try {
      const res = await fetch("/api/v1/quantification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          questionId: currentQ.id,
          userResponse: userResponse.trim(),
          metricEstimate: Number.isFinite(numericEstimate) ? numericEstimate : undefined,
          metricUnit: metricUnit.trim() || undefined,
          isVerified,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Fact verified and saved to Data Bank!");
        setTimeout(() => setSuccessMessage(null), 3000);

        // Update local question state
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === currentQ.id
              ? {
                  ...q,
                  userResponse: userResponse.trim(),
                  isAnswered: true,
                  metricEstimate: metricEstimate.trim() || undefined,
                  metricUnit: metricUnit.trim() || undefined,
                }
              : q
          )
        );

        setUserResponse("");
        setMetricEstimate("");
        setMetricUnit("");
        setIsVerified(false);

        if (onBulletUpdated) onBulletUpdated();

        // Move to next unanswered question if available
        if (activeQuestionIndex < questions.length - 1) {
          setActiveQuestionIndex((idx) => idx + 1);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to record answer");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "scale":
        return <Scale className="w-4 h-4 text-stamp" />;
      case "collaboration":
        return <Users className="w-4 h-4 text-stamp" />;
      case "tooling":
        return <Wrench className="w-4 h-4 text-marker-dark" />;
      case "outcome":
        return <TrendingUp className="w-4 h-4 text-press" />;
      default:
        return <HelpCircle className="w-4 h-4 text-graphite" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-sheet border border-rule rounded-lg max-w-2xl w-full overflow-hidden shadow-plate flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-sheet/90 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stamp-soft border border-stamp/30 rounded-lg text-stamp">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Achievement Quantification Assistant
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-press-soft text-press border border-press/20 rounded-full">
                  Zero Hallucinations (PRD 18.4)
                </span>
              </h3>
              <p className="text-xs text-graphite">
                Turn general claims into verifiable, high-impact metrics without inventing facts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-graphite hover:text-ink p-1 rounded-lg hover:bg-paper-deep"
          >
            ✕
          </button>
        </div>

        {/* Current Bullet Preview */}
        <div className="px-5 py-3 bg-paper/80 border-b border-rule/80 text-xs text-ink">
          <span className="font-semibold text-graphite normal-case tracking-normal text-[10px] block mb-1">
            Current Achievement Description:
          </span>
          <p className="italic text-ink bg-sheet/60 p-2.5 rounded-lg border border-rule">
            &ldquo;{initialText}&rdquo;
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading || generating ? (
            <div className="py-16 text-center text-graphite space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
              <p className="text-xs font-medium">
                Analyzing description structure &amp; generating targeted inquiry questions...
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-graphite space-y-3">
              <AlertTriangle className="w-8 h-8 text-marker-dark mx-auto" />
              <p className="text-xs">No questions generated yet.</p>
              <button
                onClick={generateQuestions}
                className="px-3.5 py-1.5 bg-stamp hover:bg-stamp-dark text-white rounded-lg text-xs font-semibold shadow"
              >
                Generate Inquiry Questions
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Question Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                      activeQuestionIndex === idx
                        ? "bg-stamp-soft border-stamp text-stamp"
                        : q.isAnswered
                        ? "bg-press-soft border-press/60 text-press"
                        : "bg-sheet border-rule text-graphite hover:text-ink"
                    }`}
                  >
                    {q.isAnswered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-press" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-paper-deep text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                    )}
                    <span className="capitalize">{q.category}</span>
                  </button>
                ))}
              </div>

              {/* Active Question Box */}
              {currentQ && (
                <div className="p-4 bg-paper border border-rule rounded-lg space-y-4">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-sheet border border-rule rounded-lg mt-0.5">
                      {getCategoryIcon(currentQ.category || "scale")}
                    </div>
                    <div>
                      <span className="text-[10px] normal-case font-mono tracking-normal text-stamp font-semibold">
                        Targeted Context Inquiry #{activeQuestionIndex + 1} ({currentQ.category || "context"})
                      </span>
                      <h4 className="text-sm font-semibold text-ink mt-0.5">
                        {currentQ.promptQuestion || currentQ.questionText}
                      </h4>
                    </div>
                  </div>

                  {currentQ.isAnswered && (
                    <div className="p-3 bg-press-soft border border-press/60 rounded-lg text-xs text-press">
                      <div className="font-semibold text-press flex items-center gap-1 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answer Recorded
                      </div>
                      <p className="text-ink">{currentQ.userResponse}</p>
                      {currentQ.metricEstimate && (
                        <p className="text-[11px] text-press font-mono mt-1">
                          Metric: {currentQ.metricEstimate} {currentQ.metricUnit || ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Answer Input Form */}
                  <form onSubmit={handleAnswerSubmit} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-graphite mb-1">
                        Your Detailed Answer (Truth-based facts only)
                      </label>
                      <textarea
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        placeholder="e.g. Developed real-time event streaming pipeline using WebSocket and Redis for 12,000 active tournament participants..."
                        rows={2}
                        required
                        className="w-full bg-sheet border border-rule rounded-lg p-2.5 text-xs text-ink placeholder-graphite focus:outline-none focus:border-stamp"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1">
                          Optional Quantified Figure
                        </label>
                        <input
                          type="text"
                          value={metricEstimate}
                          onChange={(e) => setMetricEstimate(e.target.value)}
                          placeholder="e.g. 40, 12000, 3x"
                          className="w-full bg-sheet border border-rule rounded-lg p-2 text-xs text-ink placeholder-graphite focus:outline-none focus:border-stamp"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1">
                          Metric Unit / Measure
                        </label>
                        <input
                          type="text"
                          value={metricUnit}
                          onChange={(e) => setMetricUnit(e.target.value)}
                          placeholder="e.g. % throughput, users, ms latency"
                          className="w-full bg-sheet border border-rule rounded-lg p-2 text-xs text-ink placeholder-graphite focus:outline-none focus:border-stamp"
                        />
                      </div>
                    </div>

                    {/* Verified vs Estimated Switch */}
                    <div className="flex items-center justify-between p-3 bg-sheet/70 border border-rule rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            isVerified ? "text-press" : "text-marker-dark"
                          }`}
                        />
                        <div>
                          <p className="text-xs font-medium text-ink">
                            {isVerified ? "Verified Hard Evidence" : "Candidate Estimate"}
                          </p>
                          <p className="text-[10px] text-graphite">
                            {isVerified
                              ? "Supported by log, commit, certificate, or production dashboard"
                              : "Self-reported estimate to be identified honestly in quality audits"}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isVerified}
                          onChange={(e) => setIsVerified(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-paper-deep peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-rule-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-press"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-graphite">
                        {successMessage && (
                          <span className="text-press font-medium">{successMessage}</span>
                        )}
                      </span>
                      <button
                        type="submit"
                        disabled={submittingAnswer || !userResponse.trim()}
                        className="px-4 py-2 bg-stamp hover:bg-stamp-dark disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-none transition-all"
                      >
                        {submittingAnswer ? "Recording..." : "Save Answer & Add Fact"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-paper border-t border-rule flex items-center justify-between">
          <div className="text-[11px] text-graphite flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-press" />
            <span>Facts are bound to Data Bank and never fabricated.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
