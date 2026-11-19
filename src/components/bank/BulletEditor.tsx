"use client";

import React, { useState } from "react";
import { AchievementBullet } from "@/types/bank";
import { FactBadge } from "./FactBadge";
import { Trash2, Edit2, ShieldAlert, Sparkles } from "lucide-react";

interface BulletEditorProps {
  bullet: AchievementBullet;
  onUpdate: (updated: Partial<AchievementBullet>) => Promise<void>;
  onDelete: () => Promise<void>;
  onQuantify?: (bullet: AchievementBullet) => void;
}

export function BulletEditor({ bullet, onUpdate, onDelete, onQuantify }: BulletEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [loading, setLoading] = useState(false);

  const hasMetrics =
    bullet.facts?.some((f) => f.factType === "metric" || f.valueNumber != null) ||
    /\d/.test(bullet.text);

  const handleSave = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await onUpdate({ text });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group border-t border-rule py-2 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="textarea text-[12.5px]"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm">
                  {loading ? "Saving" : "Save"}
                </button>
                <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-quiet">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-ink">{bullet.text}</p>

              {!hasMetrics && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-marker-dark">
                    <ShieldAlert className="h-3 w-3" strokeWidth={1.8} />
                    No measurable result
                  </span>
                  {onQuantify && (
                    <button
                      onClick={() => onQuantify(bullet)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-stamp hover:underline"
                    >
                      <Sparkles className="h-3 w-3" strokeWidth={1.8} />
                      Work out a number
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {bullet.facts && bullet.facts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {bullet.facts.map((fact) => (
                <FactBadge key={fact.id} fact={fact} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onQuantify && hasMetrics && (
            <button
              onClick={() => onQuantify(bullet)}
              className="btn btn-icon"
              title="Quantification assistant"
              aria-label="Quantification assistant"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-icon"
            title="Edit bullet"
            aria-label="Edit bullet"
          >
            <Edit2 className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
          <button
            onClick={onDelete}
            className="btn btn-icon hover:text-alarm"
            title="Delete bullet"
            aria-label="Delete bullet"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </div>
  );
}
