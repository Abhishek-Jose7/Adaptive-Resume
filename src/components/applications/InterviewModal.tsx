"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Building,
  Briefcase,
} from "lucide-react";
import { ApplicationInterview } from "@/types/bank";

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

  const fetchApplicationDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}`);
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
        setRoundNumber((data.interviews?.length || 0) + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplicationDetails();
      setIsAdding(false);
      setEditingId(null);
    }
  }, [isOpen, applicationId]);

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

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
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
