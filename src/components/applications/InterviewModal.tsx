"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { ApplicationInterview } from "@/types/bank";

interface StarStory {
  id: string;
  entryTitle: string;
  organization: string | null;
  dates: string;
  situation: string;
  task: string;
  action: string;
  result: string | null;
  citedMetrics: string[];
  citedTools: string[];
  matchedKeywords: string[];
  needsMetricPrompt: boolean;
}

interface PrepQuestion {
  id: string;
  category: string;
  keyword?: string;
  roundFocus: string;
  question: string;
  groundedCue: string;
}

interface ApplicationPrepData {
  starStories: StarStory[];
  questionChecklist: PrepQuestion[];
  gapSummary: {
    totalMissingCount: number;
    inBankNotOnResumeCount: number;
    inProfileUnverifiedCount: number;
    missingFromBankCount: number;
  } | null;
}

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  companyName: string;
  jobTitle: string;
  onInterviewUpdated?: () => void;
}

export function InterviewModal({
  isOpen,
  onClose,
  applicationId,
  companyName,
  jobTitle,
  onInterviewUpdated,
}: InterviewModalProps) {
  const [interviews, setInterviews] = useState<ApplicationInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // New interview form
  const [roundName, setRoundName] = useState("Technical Screen");
  const [roundNumber, setRoundNumber] = useState(1);
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewers, setInterviewers] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Editing feedback
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("scheduled");
  const [editFeedback, setEditFeedback] = useState("");
  const [activeModalTab, setActiveModalTab] = useState<"rounds" | "prep">("rounds");
  const [prepData, setPrepData] = useState<ApplicationPrepData | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [roundEmailDraft, setRoundEmailDraft] = useState<{ title: string; content: string } | null>(null);
  const [draftingThankYou, setDraftingThankYou] = useState(false);

  const fetchApplicationDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setInterviews(data.interviews || []);
        setRoundNumber((data.interviews?.length || 0) + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const fetchPrepPacket = useCallback(async () => {
    setPrepLoading(true);
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/prep`);
      if (res.ok) {
        const json = await res.json();
        setPrepData(json?.data ?? json);
      }
    } catch (err) {
      console.error("Failed to load interview prep packet", err);
    } finally {
      setPrepLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplicationDetails();
      fetchPrepPacket();
      setIsAdding(false);
      setEditingId(null);
      setRoundEmailDraft(null);
      setActiveModalTab("rounds");
    }
  }, [isOpen, applicationId, fetchApplicationDetails, fetchPrepPacket]);

  if (!isOpen) return null;

  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundName: roundName.trim(),
          roundNumber: Number(roundNumber),
          scheduledAt: scheduledAt || null,
          interviewers: interviewers.trim() || undefined,
          prepNotes: prepNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to add interview round");
      await fetchApplicationDetails();
      setIsAdding(false);
      setPrepNotes("");
      setInterviewers("");
      setScheduledAt("");
      if (onInterviewUpdated) onInterviewUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to save interview");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (interviewId: string) => {
    try {
      const res = await fetch(
        `/api/v1/applications/${applicationId}/interviews/${interviewId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editStatus,
            feedbackNotes: editFeedback.trim() || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update interview");
      await fetchApplicationDetails();
      setEditingId(null);
      if (onInterviewUpdated) onInterviewUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to update interview");
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm("Are you sure you want to remove this interview round?")) return;
    try {
      const res = await fetch(
        `/api/v1/applications/${applicationId}/interviews/${interviewId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete interview");
      await fetchApplicationDetails();
      if (onInterviewUpdated) onInterviewUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to remove interview");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-press-soft border border-press text-press">
            <CheckCircle2 className="w-3 h-3" /> PASSED
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-alarm-soft border border-alarm text-alarm">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-paper-deep text-graphite">
            CANCELLED
          </span>
        );
      case "scheduled":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stamp-soft border border-stamp text-stamp">
            <Clock className="w-3 h-3" /> SCHEDULED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-rule rounded-lg max-w-2xl w-full overflow-hidden shadow-plate flex flex-col max-h-[90vh] text-ink">
        {/* Header */}
        <div className="p-4 bg-sheet border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stamp-soft border border-stamp/30 rounded-lg text-stamp">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Interview Pipeline &amp; Rounds
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-stamp-soft text-stamp border border-stamp/30 rounded-full">
                  PRD 18.8
                </span>
              </h3>
              <p className="text-xs text-graphite flex items-center gap-2">
                <span>{companyName}</span>
                <span>•</span>
                <span>{jobTitle}</span>
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

        {/* Modal Tabs */}
        <div className="flex border-b border-rule bg-paper-alt px-4 gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveModalTab("rounds")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 ${
              activeModalTab === "rounds"
                ? "border-stamp text-ink font-semibold"
                : "border-transparent text-graphite hover:text-ink"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Rounds ({interviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab("prep")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 ${
              activeModalTab === "prep"
                ? "border-stamp text-ink font-semibold"
                : "border-transparent text-graphite hover:text-ink"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-stamp" />
            Vault Interview Prep &amp; Stories ({prepData?.starStories?.length || 0})
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeModalTab === "prep" ? (
            prepLoading ? (
              <div className="py-16 text-center text-graphite space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
                <p className="text-xs">Mapping STAR / XYZ stories from your Career Vault &amp; Gap Report...</p>
              </div>
            ) : !prepData ? (
              <p className="py-12 text-center text-xs text-graphite">
                Attach a posting to this application and add Career Vault entries to unlock job-specific prep.
              </p>
            ) : (
              <div className="space-y-5">
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-stamp" />
                      Behavioral &amp; Technical STAR / XYZ Story Bank
                    </h4>
                    <span className="font-mono text-[10px] text-graphite">
                      grounded in Career Vault only
                    </span>
                  </div>

                  {prepData.starStories.length === 0 ? (
                    <p className="rounded border border-dashed border-rule p-4 text-xs text-graphite">
                      No Career Vault bullets found yet. Add experience or projects in your Career Vault to generate STAR stories.
                    </p>
                  ) : (
                    prepData.starStories.map((story) => (
                      <div key={story.id} className="rounded-lg border border-rule bg-sheet p-3.5 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-ink">
                              {story.entryTitle}
                              {story.organization ? ` · ${story.organization}` : ""}
                            </p>
                            {story.matchedKeywords.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {story.matchedKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="rounded border border-press/30 bg-press-soft px-1.5 py-0.5 font-mono text-[10px] text-press"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const formatted = `S: ${story.situation}\nT: ${story.task}\nA: ${story.action}\nR: ${story.result || "Discuss real qualitative outcome without unverified numbers."}`;
                              navigator.clipboard.writeText(formatted);
                              setCopiedStoryId(story.id);
                              setTimeout(() => setCopiedStoryId(null), 1800);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-rule bg-paper-alt px-2 py-1 text-[11px] text-ink hover:border-stamp"
                          >
                            {copiedStoryId === story.id ? <Check className="w-3 h-3 text-press" /> : <Copy className="w-3 h-3" />}
                            {copiedStoryId === story.id ? "Copied" : "Copy STAR"}
                          </button>
                        </div>

                        <dl className="space-y-1 text-[11.5px] leading-relaxed">
                          <div>
                            <dt className="inline font-semibold text-graphite">Situation: </dt>
                            <dd className="inline text-ink">{story.situation}</dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-graphite">Task: </dt>
                            <dd className="inline text-ink">{story.task}</dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-graphite">Action: </dt>
                            <dd className="inline text-ink">{story.action}</dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-graphite">Result: </dt>
                            <dd className="inline text-ink">
                              {story.result ? (
                                <span className="font-medium text-press">{story.result}</span>
                              ) : (
                                <span className="italic text-marker-dark">
                                  No metric verified in Vault yet — state actual outcome without guessing numbers.
                                </span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink">
                      Role &amp; Gap Report Question Checklist
                    </h4>
                    {prepData.gapSummary && (
                      <span className="font-mono text-[10px] text-graphite">
                        {prepData.gapSummary.inBankNotOnResumeCount} in vault · {prepData.gapSummary.missingFromBankCount} gaps
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {prepData.questionChecklist.map((q) => (
                      <label
                        key={q.id}
                        className="flex items-start gap-2.5 rounded-lg border border-rule bg-sheet p-3 text-xs cursor-pointer hover:border-stamp"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedQuestions[q.id])}
                          onChange={(e) =>
                            setCheckedQuestions((prev) => ({ ...prev, [q.id]: e.target.checked }))
                          }
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <div className="space-y-1">
                          <span className="inline-block font-mono text-[10px] uppercase text-stamp">
                            {q.roundFocus}
                          </span>
                          <p className={`font-medium text-ink ${checkedQuestions[q.id] ? "line-through opacity-60" : ""}`}>
                            {q.question}
                          </p>
                          <p className="text-[11px] text-graphite">{q.groundedCue}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            )
          ) : loading ? (
            <div className="py-16 text-center text-graphite space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
              <p className="text-xs">Loading interview records...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-graphite normal-case tracking-normal">
                  Scheduled &amp; Completed Rounds ({interviews.length})
                </h4>
                {!isAdding && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stamp hover:bg-stamp-dark text-white rounded-lg text-xs font-semibold shadow transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule Round
                  </button>
                )}
              </div>

              {/* Add form */}
              {isAdding && (
                <form
                  onSubmit={handleAddInterview}
                  className="p-4 bg-sheet border border-rule rounded-lg space-y-3 text-xs"
                >
                  <h5 className="font-bold text-ink text-xs">New Interview Round</h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-graphite mb-1">Round Name</label>
                      <input
                        type="text"
                        value={roundName}
                        onChange={(e) => setRoundName(e.target.value)}
                        placeholder="e.g. Technical Coding, System Design, Bar Raiser"
                        required
                        className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                      />
                    </div>
                    <div>
                      <label className="block text-graphite mb-1">Round #</label>
                      <input
                        type="number"
                        value={roundNumber}
                        onChange={(e) => setRoundNumber(Number(e.target.value))}
                        min={1}
                        className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-graphite mb-1">Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                      />
                    </div>
                    <div>
                      <label className="block text-graphite mb-1">Interviewers / Role</label>
                      <input
                        type="text"
                        value={interviewers}
                        onChange={(e) => setInterviewers(e.target.value)}
                        placeholder="e.g. Sarah Connor (Staff Eng)"
                        className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-graphite mb-1">Preparation / Focus Topics</label>
                    <textarea
                      value={prepNotes}
                      onChange={(e) => setPrepNotes(e.target.value)}
                      placeholder="e.g. Distributed caching, Redis pub/sub, behavioral leadership principles"
                      rows={2}
                      className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs placeholder-graphite focus:outline-none focus:border-stamp"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 bg-paper-deep text-ink hover:bg-paper-deep rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 bg-stamp hover:bg-stamp-dark disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow"
                    >
                      {submitting ? "Saving..." : "Save Interview"}
                    </button>
                  </div>
                </form>
              )}

              {/* List of interviews */}
              {interviews.length === 0 && !isAdding ? (
                <div className="text-center py-12 text-graphite text-xs space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-graphite" />
                  <p>No interview rounds scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((int) => (
                    <div
                      key={int.id}
                      className="p-3.5 bg-sheet/60 border border-rule rounded-lg space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-graphite">
                              Round {int.roundNumber}:
                            </span>
                            <span className="font-bold text-ink text-sm">
                              {int.roundName}
                            </span>
                            {getStatusBadge(int.status)}
                          </div>

                          <div className="flex items-center gap-3 text-graphite text-[11px] mt-1">
                            {int.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-graphite" />
                                {new Date(int.scheduledAt).toLocaleString()}
                              </span>
                            )}
                            {int.interviewers && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-graphite" />
                                {int.interviewers}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={draftingThankYou}
                            onClick={async () => {
                              setDraftingThankYou(true);
                              try {
                                const res = await fetch(`/api/v1/applications/${applicationId}/follow-up`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    kind: "thank_you",
                                    roundId: int.id,
                                    saveToCoverLetters: true,
                                  }),
                                });
                                const json = await res.json();
                                if (res.ok) {
                                  const payload = json?.data ?? json;
                                  setRoundEmailDraft({ title: payload.title, content: payload.content });
                                }
                              } finally {
                                setDraftingThankYou(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-paper-alt border border-rule hover:border-stamp text-ink rounded text-[11px]"
                            title="Generate thank-you email grounded in Career Vault facts"
                          >
                            <Mail className="w-3 h-3" /> Thank-you
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(int.id);
                              setEditStatus(int.status);
                              setEditFeedback(int.feedbackNotes || "");
                            }}
                            className="px-2 py-1 bg-paper-deep hover:bg-paper-deep text-ink rounded text-[11px]"
                          >
                            Outcome &amp; Notes
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(int.id)}
                            className="p-1 text-graphite hover:text-alarm rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {int.prepNotes && (
                        <div className="p-2 bg-paper rounded border border-rule/80 text-[11px] text-graphite">
                          <span className="font-semibold text-ink">Prep: </span>
                          {int.prepNotes}
                        </div>
                      )}

                      {int.feedbackNotes && (
                        <div className="p-2 bg-paper rounded border border-rule/80 text-[11px] text-press">
                          <span className="font-semibold text-press">Feedback / Questions: </span>
                          {int.feedbackNotes}
                        </div>
                      )}

                      {/* Edit feedback drawer */}
                      {editingId === int.id && (
                        <div className="p-3 bg-paper border border-rule rounded-lg space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <label className="text-graphite font-medium">Outcome:</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="bg-sheet border border-rule rounded px-2 py-1 text-ink text-xs"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="passed">Passed Round</option>
                              <option value="failed">Rejected / Did not pass</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-graphite mb-1">Feedback / Debrief Notes</label>
                            <textarea
                              value={editFeedback}
                              onChange={(e) => setEditFeedback(e.target.value)}
                              placeholder="e.g. Questions asked on B-Trees and Paxos; positive reaction to scalability answer"
                              rows={2}
                              className="w-full bg-sheet border border-rule rounded p-2 text-ink text-xs placeholder-graphite"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 bg-paper-deep text-ink rounded text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(int.id)}
                              className="px-3 py-1 bg-press hover:bg-press text-white rounded text-xs font-semibold"
                            >
                              Update Status
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {roundEmailDraft && (
                    <div className="rounded-lg border border-stamp/40 bg-stamp-soft/40 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{roundEmailDraft.title} (Saved to Cover Letters)</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(roundEmailDraft.content)}
                          className="inline-flex items-center gap-1 text-stamp font-medium hover:underline"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed bg-white p-2.5 border border-rule rounded">
                        {roundEmailDraft.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-sheet border-t border-rule flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
