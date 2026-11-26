"use client";

import React from "react";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { computeStaleStageInfo } from "@/lib/utils/applicationStageUtils";
import { Trash2, Mail, Clock, AlertTriangle } from "lucide-react";

export interface ApplicationItem {
  id: string;
  userId: string;
  jobId: string | null;
  resumeVersionId: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  followUpAt: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  daysInStage?: number;
  isStale?: boolean;
  followUpDue?: boolean;
  reminderLabel?: string | null;
  notes: string | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  jobLocation?: string | null;
  versionNumber?: number | null;
}

const STAGES: { id: ApplicationStatus; label: string }[] = [
  { id: "Saved", label: "Saved" },
  { id: "Applied", label: "Applied" },
  { id: "Screening", label: "Screening" },
  { id: "Interview", label: "Interviewing" },
  { id: "Offer", label: "Offer" },
  { id: "Rejected", label: "Archived" },
];

interface Props {
  applications: ApplicationItem[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onOpenInterviews?: (app: ApplicationItem) => void;
  onDraftFollowUp?: (app: ApplicationItem) => void;
}

export function ApplicationKanbanBoard({
  applications,
  onStatusChange,
  onDelete,
  onOpenInterviews,
  onDraftFollowUp,
}: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {STAGES.map((stage) => {
          const stageItems = applications.filter((app) => app.status === stage.id);

          return (
            <section key={stage.id} className="w-[260px] shrink-0">
              <div className="flex items-baseline justify-between border-t border-ink pt-2">
                <h3 className="text-[12.5px] font-semibold text-ink">{stage.label}</h3>
                <span className="folio">{stageItems.length}</span>
              </div>

              <div className="mt-2 space-y-2">
                {stageItems.length === 0 ? (
                  <p className="border border-dashed border-rule px-3 py-6 text-center text-[11.5px] text-graphite">
                    Empty
                  </p>
                ) : (
                  stageItems.map((app) => {
                    const stageMeta =
                      typeof app.daysInStage === "number"
                        ? {
                            daysInStage: app.daysInStage,
                            isStale: Boolean(app.isStale),
                            followUpDue: Boolean(app.followUpDue),
                            reminderLabel: app.reminderLabel || null,
                          }
                        : computeStaleStageInfo(app);

                    return (
                      <article
                        key={app.id}
                        className={`group border bg-sheet p-3 transition-colors hover:border-rule-strong ${
                          stageMeta.isStale ? "border-marker/60" : "border-rule"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-semibold leading-snug text-ink">
                            {app.jobTitle || "Untitled role"}
                          </h4>
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-paper-alt px-1.5 py-0.5 font-mono text-[10px] text-graphite">
                            <Clock className="h-2.5 w-2.5" />
                            {stageMeta.daysInStage}d
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-[11.5px] text-graphite">
                          {app.jobCompany || "No company"}
                        </p>

                        {stageMeta.reminderLabel && (
                          <div className="mt-2 flex items-center gap-1 rounded border border-marker/40 bg-marker-soft px-2 py-1 text-[10.5px] font-medium text-marker-dark">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{stageMeta.reminderLabel}</span>
                          </div>
                        )}

                        <dl className="mt-2 space-y-0.5 font-mono text-[10.5px] text-graphite">
                          {app.appliedAt && (
                            <div className="flex justify-between gap-2">
                              <dt>applied</dt>
                              <dd>{new Date(app.appliedAt).toLocaleDateString()}</dd>
                            </div>
                          )}
                          {app.followUpAt && (
                            <div className="flex justify-between gap-2 text-marker-dark">
                              <dt>follow up</dt>
                              <dd>{new Date(app.followUpAt).toLocaleDateString()}</dd>
                            </div>
                          )}
                        </dl>

                        <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-rule pt-2">
                          <select
                            value={app.status}
                            onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                            aria-label="Application stage"
                            className="max-w-[96px] cursor-pointer border-0 bg-transparent p-0 font-mono text-[10.5px] text-graphite hover:text-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1">
                            {onDraftFollowUp && (
                              <button
                                type="button"
                                onClick={() => onDraftFollowUp(app)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10.5px] font-medium text-ink border border-rule bg-paper-alt hover:border-stamp hover:text-stamp"
                                title="Generate truth-grounded follow-up or thank-you email draft"
                              >
                                <Mail className="h-2.5 w-2.5" />
                                Follow up
                              </button>
                            )}
                            {onOpenInterviews && (
                              <button
                                onClick={() => onOpenInterviews(app)}
                                className="px-1.5 py-0.5 text-[10.5px] font-medium text-stamp underline decoration-rule underline-offset-2 hover:decoration-stamp"
                              >
                                Rounds &amp; Prep
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(app.id)}
                              className="p-1 text-graphite opacity-0 transition-opacity hover:text-alarm group-hover:opacity-100 focus-visible:opacity-100"
                              aria-label="Delete application"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
