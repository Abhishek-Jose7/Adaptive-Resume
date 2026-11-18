"use client";

import React, { useState, useEffect } from "react";
import { ApplicationKanbanBoard, ApplicationItem } from "@/components/applications/ApplicationKanbanBoard";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { Briefcase, Plus, LayoutGrid, List, RefreshCw } from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showCreateModal, setShowCreateModal] = useState(false);

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

      // Also fetch user jobs for dropdown
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
    // Optimistic UI update
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
        fetchApplications();
      }
    } catch (err) {
      console.error("Create application error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            Application Tracker
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track job applications across recruitment stages, follow-up deadlines, and resume versions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg bg-gray-50 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded flex items-center gap-1 font-medium ${
                viewMode === "kanban" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-gray-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded flex items-center gap-1 font-medium ${
                viewMode === "table" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-gray-600"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* Board or List view */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading applications...</div>
      ) : viewMode === "kanban" ? (
        <ApplicationKanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        /* Table View */
        <div className="bg-white border rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-3">Job / Role</th>
                <th className="p-3">Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Applied Date</th>
                <th className="p-3">Follow-up</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 italic">
                    No applications tracked yet.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">{app.jobTitle || "Untitled"}</td>
                    <td className="p-3">{app.jobCompany || "N/A"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100">
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-amber-700 font-medium">
                      {app.followUpAt ? new Date(app.followUpAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-gray-400 hover:text-red-600 font-medium text-xs"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Track New Job Application</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Target Job Record (Optional)
                </label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2 bg-white"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Application Stage
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="w-full text-xs border rounded-lg p-2 bg-white font-medium"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Applied Date</label>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes & Next Steps</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referral contacts, recruiter emails, salary discussions, interview round topics..."
                  className="w-full text-xs border rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add to Tracker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
