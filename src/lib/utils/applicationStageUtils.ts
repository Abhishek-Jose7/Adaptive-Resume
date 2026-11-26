export interface StaleStageInfo {
  daysInStage: number;
  isStale: boolean;
  followUpDue: boolean;
  reminderLabel: string | null;
}

const STAGE_STALE_DAYS: Record<string, number> = {
  Applied: 7,
  Screening: 5,
  Interview: 3,
};

const CLOSED_STATUSES = new Set(["Offer", "Rejected", "Withdrawn", "Archived"]);

/**
 * Computes days spent in the current Kanban stage and stale/follow-up reminder flags.
 */
export function computeStaleStageInfo(
  app: {
    status: string;
    appliedAt?: Date | string | null;
    followUpAt?: Date | string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
  nowInput?: Date
): StaleStageInfo {
  const now = nowInput || new Date();

  const stageAnchorRaw =
    app.status === "Applied" && app.appliedAt
      ? app.appliedAt
      : app.updatedAt || app.appliedAt || app.createdAt || now;
  const stageAnchor = stageAnchorRaw instanceof Date ? stageAnchorRaw : new Date(stageAnchorRaw);
  const diffMs = Math.max(0, now.getTime() - stageAnchor.getTime());
  const daysInStage = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const followUpDate = app.followUpAt
    ? app.followUpAt instanceof Date
      ? app.followUpAt
      : new Date(app.followUpAt)
    : null;
  const followUpDue = Boolean(
    followUpDate && !CLOSED_STATUSES.has(app.status) && followUpDate.getTime() <= now.getTime()
  );

  const threshold = STAGE_STALE_DAYS[app.status];
  const isStale = Boolean(
    !CLOSED_STATUSES.has(app.status) && ((threshold && daysInStage >= threshold) || followUpDue)
  );

  let reminderLabel: string | null = null;
  if (followUpDue) {
    reminderLabel = `Follow-up due (${daysInStage}d in ${app.status})`;
  } else if (isStale) {
    reminderLabel = `${daysInStage}d in ${app.status} · Follow-up recommended`;
  }

  return { daysInStage, isStale, followUpDue, reminderLabel };
}
