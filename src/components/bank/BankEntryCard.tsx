"use client";

import React, { useState } from "react";
import { BankEntry, AchievementBullet } from "@/types/bank";
import { BulletEditor } from "./BulletEditor";
import { Plus, Trash2, Edit, AlertTriangle } from "lucide-react";

interface BankEntryCardProps {
  entry: BankEntry;
  onEdit: (entry: BankEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onAddBullet: (entryId: string, text: string) => Promise<void>;
  onUpdateBullet: (bulletId: string, updated: Partial<AchievementBullet>) => Promise<void>;
  onDeleteBullet: (bulletId: string) => Promise<void>;
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
  onEdit,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onDeleteBullet,
  onQuantifyBullet,
}: BankEntryCardProps) {
  const [isAddingBullet, setIsAddingBullet] = useState(false);
  const [newBulletText, setNewBulletText] = useState("");
  const [loading, setLoading] = useState(false);

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
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-graphite">
            {entry.organization && <span className="font-medium text-ink">{entry.organization}</span>}
            {entry.location && <span>{entry.location}</span>}
            <span className="font-mono text-[11px]">
              {entry.startDate || "no date"} — {entry.isCurrent ? "present" : entry.endDate || "present"}
            </span>
          </div>

          {hasMissingDates && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-marker-dark">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
              Dates missing — parsers will read this entry as undated.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
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
            {bulletCount} {bulletCount === 1 ? "bullet" : "bullets"}
          </span>
          <button
            onClick={() => setIsAddingBullet(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-stamp hover:underline"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add bullet
          </button>
        </div>

        {bulletCount > 0 ? (
          <div className="space-y-1.5">
            {entry.bullets?.map((bullet) => (
              <BulletEditor
                key={bullet.id}
                bullet={bullet}
                onUpdate={(updated) => onUpdateBullet(bullet.id, updated)}
                onDelete={() => onDeleteBullet(bullet.id)}
                onQuantify={onQuantifyBullet ? () => onQuantifyBullet(entry, bullet) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-rule px-3 py-4 text-center text-[12px] text-graphite">
            No bullets yet. A bullet is one verifiable thing you did.
          </p>
        )}

        {isAddingBullet && (
          <div className="mt-2.5 border border-rule bg-paper-alt p-3">
            <textarea
              value={newBulletText}
              onChange={(e) => setNewBulletText(e.target.value)}
              placeholder="Led the migration of the billing worker to a queue, cutting retry failures from 4% to 0.3%"
              rows={3}
              className="textarea"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAddBulletSubmit}
                disabled={loading || !newBulletText.trim()}
                className="btn btn-primary btn-sm"
              >
                {loading ? "Saving" : "Save bullet"}
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
