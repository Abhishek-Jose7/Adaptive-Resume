"use client";

import React, { useState, useMemo } from "react";
import { BankEntry, AchievementBullet } from "@/types/bank";
import { BulletEditor } from "./BulletEditor";
import { Plus, Trash2, Edit, AlertTriangle, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { getBulletSuggestions } from "@/lib/services/vaultSuggestionService";

interface BankEntryCardProps {
  entry: BankEntry;
  allEntries?: BankEntry[];
  confidenceRank?: number;
  totalProjectsCount?: number;
  onEdit: (entry: BankEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onAddBullet: (entryId: string, text: string) => Promise<void>;
  onUpdateBullet: (bulletId: string, updated: Partial<AchievementBullet>) => Promise<void>;
  onDeleteBullet: (bulletId: string) => Promise<void>;
  onReorderBullets?: (entryId: string, bulletIds: string[]) => Promise<void>;
  onMoveProjectUp?: (entryId: string) => Promise<void>;
  onMoveProjectDown?: (entryId: string) => Promise<void>;
  onSetProjectConfidenceRank?: (entryId: string, targetRankIndex: number) => Promise<void>;
  onQuantifyBullet?: (entry: BankEntry, bullet: AchievementBullet) => void;
}

const typeLabel: Record<string, string> = {
  experience: "experience",
  education: "education",
  project: "project",
  skill_group: "skills",
  certification: "certification",
  award: "award",
  publication: "publication",
  volunteer: "volunteer",
  custom: "custom",
};

export function BankEntryCard({
  entry,
  allEntries,
  confidenceRank,
  totalProjectsCount,
  onEdit,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onDeleteBullet,
  onReorderBullets,
  onMoveProjectUp,
  onMoveProjectDown,
  onSetProjectConfidenceRank,
  onQuantifyBullet,
}: BankEntryCardProps) {
  const [isAddingBullet, setIsAddingBullet] = useState(false);
  const [newBulletText, setNewBulletText] = useState("");
  const [loading, setLoading] = useState(false);

  const bulletSuggestions = useMemo(() => {
    if (!isAddingBullet) return null;
    return getBulletSuggestions({
      targetEntry: entry,
      draftText: newBulletText,
      existingEntries: allEntries || [entry],
    });
  }, [isAddingBullet, entry, newBulletText, allEntries]);

  const appendSuggestedToken = (token: string) => {
    setNewBulletText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return token;
      if (entry.entryType === "skill_group") {
        return trimmed.endsWith(",") ? `${trimmed} ${token}` : `${trimmed}, ${token}`;
      }
      return `${trimmed} ${token}`;
    });
  };

  const handleAddBulletSubmit = async () => {
    if (!newBulletText.trim()) return;
    setLoading(true);
    try {
      await onAddBullet(entry.id, newBulletText.trim());
      setNewBulletText("");
      setIsAddingBullet(false);
    } finally {
      setLoading(false);
    }
  };

  const hasMissingDates =
    (entry.entryType === "experience" || entry.entryType === "education") &&
    !entry.startDate &&
    !entry.isCurrent;

  const bulletCount = entry.bullets?.length || 0;

  return (
    <article className="panel">
      <header className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight">{entry.title}</h3>
            <span className="border border-rule px-1.5 py-0.5 font-mono text-[10px] text-graphite">
              {typeLabel[entry.entryType] || entry.entryType.replace("_", " ")}
            </span>
            {entry.entryType === "project" && typeof confidenceRank === "number" && (
              <span
                className="border border-stamp/40 bg-stamp-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-stamp"
                title="Projects with higher confidence (#1 highest) are prioritized when tailoring for roles."
              >
                Confidence #{confidenceRank}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-graphite">
            {entry.organization && <span className="font-medium text-ink">{entry.organization}</span>}
            {entry.location && <span>{entry.location}</span>}
            {(() => {
              const isWorkOrEdu = entry.entryType === "experience" || entry.entryType === "education" || entry.entryType === "volunteer";
              let dateLabel: string | null = null;
              if (entry.startDate && entry.endDate) {
                dateLabel = `${entry.startDate} — ${entry.endDate}`;
              } else if (entry.startDate && entry.isCurrent && isWorkOrEdu) {
                dateLabel = `${entry.startDate} — present`;
              } else if (entry.startDate) {
                dateLabel = entry.startDate;
              } else if (entry.endDate) {
                dateLabel = entry.endDate;
              } else if (entry.isCurrent && isWorkOrEdu) {
                dateLabel = "present";
              }
              return dateLabel ? (
                <span className="font-mono text-[11px]">{dateLabel}</span>
              ) : null;
            })()}
          </div>

          {hasMissingDates && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-marker-dark">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
              Dates missing — parsers will read this entry as undated.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {entry.entryType === "project" &&
            typeof confidenceRank === "number" &&
            onMoveProjectUp &&
            onMoveProjectDown && (
              <>
                {onSetProjectConfidenceRank && (totalProjectsCount ?? 0) > 1 && (
                  <select
                    value={confidenceRank - 1}
                    onChange={(e) =>
                      void onSetProjectConfidenceRank(entry.id, Number(e.target.value))
                    }
                    className="mr-1 rounded border border-rule bg-paper px-1.5 py-0.5 font-mono text-[10.5px] text-ink"
                    title="Set exact project preference rank (#1 highest, last lowest)"
                  >
                    {Array.from({ length: totalProjectsCount ?? 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0
                          ? "#1 Top"
                          : i === (totalProjectsCount ?? 1) - 1
                            ? `#${i + 1} Lowest`
                            : `#${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => void onMoveProjectUp(entry.id)}
                  disabled={confidenceRank <= 1}
                  className="btn btn-icon disabled:opacity-35"
                  title="Increase project confidence rank"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.7} />
                </button>
                <button
                  onClick={() => void onMoveProjectDown(entry.id)}
                  disabled={confidenceRank >= (totalProjectsCount ?? confidenceRank)}
                  className="btn btn-icon disabled:opacity-35"
                  title="Decrease project confidence rank"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.7} />
                </button>
              </>
            )}
          <button onClick={() => onEdit(entry)} className="btn btn-icon" title="Edit entry">
            <Edit className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="btn btn-icon hover:text-alarm"
            title="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>
      </header>

      {entry.descriptionContext && (
        <div className="border-t border-rule bg-marker-soft px-4 py-2.5 text-[12.5px] leading-relaxed sm:px-5">
          <span className="font-mono text-[10.5px] text-marker-dark">context — </span>
          {entry.descriptionContext}
        </div>
      )}

      <div className="border-t border-rule px-4 py-3.5 sm:px-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[12px] text-graphite">
            {entry.entryType === "skill_group"
              ? `${bulletCount} individual ${bulletCount === 1 ? "skill" : "skills"}`
              : `${bulletCount} ${bulletCount === 1 ? "bullet" : "bullets"}`}
          </span>
          <button
            onClick={() => setIsAddingBullet(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-stamp hover:underline"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            {entry.entryType === "skill_group" ? "Add individual skill" : "Add bullet"}
          </button>
        </div>

        {bulletCount > 0 ? (
          <div className="space-y-1.5">
            {(entry.bullets || []).map((bullet, idx, arr) => {
              const swapBullets = async (targetIdx: number) => {
                if (!onReorderBullets) return;
                const next = [...arr];
                const [moved] = next.splice(idx, 1);
                next.splice(targetIdx, 0, moved);
                await onReorderBullets(entry.id, next.map((b) => b.id));
              };
              return (
                <BulletEditor
                  key={bullet.id}
                  bullet={bullet}
                  entry={entry}
                  allEntries={allEntries}
                  isFirst={idx === 0}
                  isLast={idx === arr.length - 1}
                  onMoveUp={onReorderBullets ? () => swapBullets(idx - 1) : undefined}
                  onMoveDown={onReorderBullets ? () => swapBullets(idx + 1) : undefined}
                  onUpdate={(updated) => onUpdateBullet(bullet.id, updated)}
                  onDelete={() => onDeleteBullet(bullet.id)}
                  onQuantify={onQuantifyBullet ? () => onQuantifyBullet(entry, bullet) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <p className="border border-dashed border-rule px-3 py-4 text-center text-[12px] text-graphite">
            {entry.entryType === "skill_group"
              ? "No skills yet. Add individual skills or tools into this group."
              : "No bullets yet. A bullet is one verifiable thing you did."}
          </p>
        )}

        {isAddingBullet && (
          <div className="mt-2.5 border border-rule bg-paper-alt p-3 space-y-2.5">
            <textarea
              value={newBulletText}
              onChange={(e) => setNewBulletText(e.target.value)}
              placeholder={
                entry.entryType === "skill_group"
                  ? "e.g., TypeScript, FastAPI, PostgreSQL"
                  : "Led the migration of the billing worker to a queue, cutting retry failures from 4% to 0.3%"
              }
              rows={entry.entryType === "skill_group" ? 2 : 3}
              className="textarea"
              autoFocus
            />

            {bulletSuggestions &&
              (bulletSuggestions.evidencedSkillsToAdd.length > 0 ||
                bulletSuggestions.draftSuggestions.length > 0 ||
                bulletSuggestions.vaultContextTools.length > 0 ||
                bulletSuggestions.metricHint) && (
                <div className="rounded border border-rule bg-paper px-2.5 py-2 space-y-1.5">
                  {bulletSuggestions.evidencedSkillsToAdd.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-graphite">
                        <Sparkles className="h-3 w-3 text-stamp" />
                        From your existing roles & projects:
                      </span>
                      {bulletSuggestions.evidencedSkillsToAdd.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => appendSuggestedToken(skill)}
                          className="rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  )}

                  {bulletSuggestions.draftSuggestions.map((sug, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-graphite">
                        <strong className="text-ink">{sug.label}:</strong> {sug.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewBulletText(sug.text)}
                        className="font-medium text-stamp hover:underline shrink-0"
                      >
                        Use template
                      </button>
                    </div>
                  ))}

                  {bulletSuggestions.vaultContextTools.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-graphite">
                        Tools in your vault:
                      </span>
                      {bulletSuggestions.vaultContextTools.slice(0, 6).map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => appendSuggestedToken(tool)}
                          className="rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                        >
                          + {tool}
                        </button>
                      ))}
                    </div>
                  )}

                  {bulletSuggestions.metricHint && (
                    <p className="text-[11px] text-marker-dark">{bulletSuggestions.metricHint}</p>
                  )}
                </div>
              )}

            <div className="flex gap-2">
              <button
                onClick={handleAddBulletSubmit}
                disabled={loading || !newBulletText.trim()}
                className="btn btn-primary btn-sm"
              >
                {loading ? "Saving" : entry.entryType === "skill_group" ? "Save skill" : "Save bullet"}
              </button>
              <button
                onClick={() => {
                  setIsAddingBullet(false);
                  setNewBulletText("");
                }}
                className="btn btn-sm btn-quiet"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
