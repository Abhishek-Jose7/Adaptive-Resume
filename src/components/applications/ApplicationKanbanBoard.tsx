"use client";

import React from "react";
import { ApplicationStatus } from "@/lib/services/applicationService";
import { Trash2 } from "lucide-react";

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
}

export function ApplicationKanbanBoard({
  applications,
  onStatusChange,
  onDelete,
  onOpenInterviews,
}: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {STAGES.map((stage) => {
          const stageItems = applications.filter((app) => app.status === stage.id);

          return (
            <section key={stage.id} className="w-[248px] shrink-0">
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
                  stageItems.map((app) => (
                    <article
                      key={app.id}
                      className="group border border-rule bg-sheet p-3 transition-colors hover:border-rule-strong"
                    >
                      <h4 className="text-[13px] font-semibold leading-snug text-ink">
                        {app.jobTitle || "Untitled role"}
                      </h4>
                      <p className="mt-0.5 truncate text-[11.5px] text-graphite">
                        {app.jobCompany || "No company"}
                      </p>

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
                          className="max-w-[104px] cursor-pointer border-0 bg-transparent p-0 font-mono text-[10.5px] text-graphite hover:text-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-0.5">
                          {onOpenInterviews && (
                            <button
                              onClick={() => onOpenInterviews(app)}
                              className="px-1.5 py-0.5 text-[10.5px] font-medium text-stamp underline decoration-rule underline-offset-2 hover:decoration-stamp"
                            >
                              Rounds
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
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
