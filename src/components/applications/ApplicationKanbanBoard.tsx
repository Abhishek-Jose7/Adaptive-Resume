"use client";

import React from "react";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { Building2, Calendar, Clock, MoreHorizontal, ArrowRight, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface ApplicationItem {
  id: string;
  userId: string;
  jobId: string | null;
  resumeVersionId: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  followUpAt: string | null;
  notes: string | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  jobLocation?: string | null;
  versionNumber?: number | null;
}

const STAGES: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: "Saved", label: "Saved", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { id: "Applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Screening", label: "Screening", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Interview", label: "Interviewing", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Offer", label: "Offer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Rejected", label: "Archived / Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

interface Props {
  applications: ApplicationItem[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}

export function ApplicationKanbanBoard({
  applications,
  onStatusChange,
  onDelete,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageItems = applications.filter((app) => app.status === stage.id);

        return (
          <div
            key={stage.id}
            className="bg-gray-50/70 border rounded-xl p-3 flex flex-col min-w-[240px] max-h-[calc(100vh-220px)]"
          >
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full border ${stage.color}`} />
                {stage.label}
              </span>
              <span className="text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border">
                {stageItems.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {stageItems.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-gray-400 italic">No applications</div>
              ) : (
                stageItems.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white border rounded-lg p-3 shadow-2xs hover:shadow-xs transition-all space-y-2 group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                        {app.jobTitle || "Untitled Position"}
                      </h4>
                      <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {app.jobCompany || "Company N/A"}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1 text-[10px] text-gray-500">
                      {app.appliedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {app.followUpAt && (
                        <div className="flex items-center gap-1 text-amber-700 font-medium">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Follow-up: {new Date(app.followUpAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Move and Delete Footer */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <select
                        value={app.status}
                        onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                        className="text-[10px] border rounded bg-white py-0.5 px-1 text-gray-600 font-medium"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move: {s.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => onDelete(app.id)}
                        className="text-gray-300 hover:text-red-600 p-1"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
