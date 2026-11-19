"use client";

import React, { useState, useEffect } from "react";
import { ApplicationKanbanBoard, ApplicationItem } from "@/components/applications/ApplicationKanbanBoard";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { InterviewModal } from "@/components/applications/InterviewModal";
import { Plus, RefreshCw, Calendar, Trash2, LayoutGrid, List, X } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";

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
    <div>
      <header className="mb-5 flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
            Applications
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
            Six stages, from saved to signed. Each card keeps the posting, the tailored resume and the
            interview rounds in one place.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          Track an application
        </button>
      </header>

      <div className="mb-5 flex items-start justify-between gap-3">
        <Tabs
          value={viewMode}
          onChange={(id) => setViewMode(id as "kanban" | "table")}
          items={[
            { id: "kanban", label: "Board" },
            { id: "table", label: "List" },
          ]}
          className="flex-1 border-b-0 sm:flex-none"
        >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-graphite">
          <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
          Reading your pipeline
        </div>
      ) : viewMode === "kanban" ? (
        <ApplicationKanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onOpenInterviews={(app) => setSelectedAppForInterview(app)}
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-rule bg-paper-alt text-[12px] text-graphite">
              <tr>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Applied</th>
                <th className="px-4 py-2.5 font-medium">Follow up</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-graphite">
                    Nothing tracked yet. Add the first application to start the pipeline.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-paper-alt">
                    <td className="px-4 py-3 font-medium">{app.jobTitle || "Untitled"}</td>
                    <td className="px-4 py-3 text-graphite">{app.jobCompany || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex border border-rule-strong px-2 py-0.5 font-mono text-[10.5px] text-graphite">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-graphite">{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-marker-dark">{app.followUpAt ? new Date(app.followUpAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedAppForInterview(app)} className="btn btn-sm"><Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />Rounds</button>
                        <button onClick={() => handleDelete(app.id)} className="btn btn-icon hover:text-alarm" aria-label="Delete application"><Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
        </Tabs>
        <span className="folio hidden sm:block">{applications.length} records</span>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md border border-rule bg-sheet">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
              <h2 className="font-display text-[17px] font-semibold tracking-tight">Track an application</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-icon" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 px-5 py-5">
              <div>
                <label className="field-label">Posting (optional)</label>
                <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="select">
                  <option value="">No posting attached</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} at {j.company || "Company"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Stage</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="select"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interviewing</option>
                  <option value="Offer">Offer received</option>
                  <option value="Rejected">Archived or rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Applied on</label>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="field-label">Follow up</label>
                  <input
                    type="date"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referral, recruiter, compensation notes"
                  rows={3}
                  className="textarea"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-rule pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-quiet">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Saving" : "Add record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
