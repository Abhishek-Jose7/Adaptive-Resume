"use client";

import React, { useState, useEffect } from "react";
import { ApplicationKanbanBoard, ApplicationItem } from "@/components/applications/ApplicationKanbanBoard";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { InterviewModal } from "@/components/applications/InterviewModal";
import { Briefcase, Plus, LayoutGrid, List, RefreshCw, Calendar, Trash2 } from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState<ApplicationItem | null>(null);

  // New Application Form State
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("Saved");
  const [appliedAt, setAppliedAt] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [availableJobs, setAvailableJobs] = useState<Array<{ id: string; title: string; company: string }>>([]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/applications");
      if (res.ok) {
        const json = await res.json();
        setApplications(json.data || json || []);
      }

      const jobsRes = await fetch("/api/v1/jobs");
      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        setAvailableJobs(jobsJson.data || jobsJson || []);
      }
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    try {
      await fetch(`/api/v1/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update status", err);
      fetchApplications();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application record?")) return;

    setApplications((prev) => prev.filter((app) => app.id !== id));
    try {
      await fetch(`/api/v1/applications/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete application", err);
      fetchApplications();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobId || null,
          status,
          appliedAt: appliedAt || null,
          followUpAt: followUpAt || null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setJobId("");
        setNotes("");
        setAppliedAt("");
        setFollowUpAt("");
        await fetchApplications();
      }
    } catch (err) {
      console.error("Failed to create application", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Job Applications Tracker
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-mono">
              PRD 18.8
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track interview pipeline, snapshot JD requirements, and preserve tailored resume links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-blue-600 text-white font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* Board or List view */}
      {loading ? (
        <div className="text-center py-20 text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Loading application pipelines...
        </div>
      ) : viewMode === "kanban" ? (
        <ApplicationKanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onOpenInterviews={(app) => setSelectedAppForInterview(app)}
        />
      ) : (
        /* Table View */
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-950 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3">Job / Role</th>
                <th className="p-3">Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Applied Date</th>
                <th className="p-3">Follow-up</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                    No applications tracked yet. Click &ldquo;Add Application&rdquo; to begin.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">{app.jobTitle || "Untitled"}</td>
                    <td className="p-3 text-gray-300">{app.jobCompany || "N/A"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-amber-400 font-medium">
                      {app.followUpAt ? new Date(app.followUpAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedAppForInterview(app)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800"
                      >
                        <Calendar className="w-3 h-3" /> Rounds
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-gray-500 hover:text-rose-400 font-medium text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-white">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Track New Job Application
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">
                  Select Target Job Record (Optional)
                </label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full text-xs border border-gray-800 rounded-lg p-2 bg-gray-950 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No specific Job record selected --</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} at {j.company || "Company"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">
                  Application Stage
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="w-full text-xs border border-gray-800 rounded-lg p-2 bg-gray-950 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interviewing</option>
                  <option value="Offer">Offer Received</option>
                  <option value="Rejected">Archived / Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Date Applied</label>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="w-full text-xs border border-gray-800 rounded-lg p-2 bg-gray-950 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Next Follow-Up</label>
                  <input
                    type="date"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="w-full text-xs border border-gray-800 rounded-lg p-2 bg-gray-950 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Notes &amp; Observations</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referral contact, recruiter name, compensation notes..."
                  rows={3}
                  className="w-full text-xs border border-gray-800 rounded-lg p-2 bg-gray-950 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow"
                >
                  {saving ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Rounds Modal (PRD 18.8) */}
      {selectedAppForInterview && (
        <InterviewModal
          isOpen={Boolean(selectedAppForInterview)}
          onClose={() => setSelectedAppForInterview(null)}
          applicationId={selectedAppForInterview.id}
          companyName={selectedAppForInterview.jobCompany || "Company"}
          jobTitle={selectedAppForInterview.jobTitle || "Role"}
          onInterviewUpdated={fetchApplications}
        />
      )}
    </div>
  );
}
