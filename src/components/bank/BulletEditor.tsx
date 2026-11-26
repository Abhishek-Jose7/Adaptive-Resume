"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AchievementBullet, BankEntry } from "@/types/bank";
import { FactBadge } from "./FactBadge";
import { Trash2, Edit2, ShieldAlert, Sparkles, Wand2, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { getBulletSuggestions } from "@/lib/services/vaultSuggestionService";

interface BulletEditorProps {
  bullet: AchievementBullet;
  entry?: BankEntry;
  allEntries?: BankEntry[];
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => Promise<void> | void;
  onMoveDown?: () => Promise<void> | void;
  onUpdate: (updated: Partial<AchievementBullet>) => Promise<void>;
  onDelete: () => Promise<void>;
  onQuantify?: (bullet: AchievementBullet) => void;
}

interface RewritePreview {
  rewrittenText: string;
  hasVerifiedMetric: boolean;
  suggestedMetricQuestion: string | null;
}

export function BulletEditor({
  bullet,
  entry,
  allEntries,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
  onQuantify,
}: BulletEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [loading, setLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewritePreview, setRewritePreview] = useState<RewritePreview | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  useEffect(() => {
    setText(bullet.text);
  }, [bullet.text]);

  const hasMetrics =
    bullet.facts?.some((f) => f.factType === "metric" || f.valueNumber != null) ||
    /\d/.test(bullet.text);

  const editSuggestions = useMemo(() => {
    if (!isEditing || !entry) return null;
    return getBulletSuggestions({
      targetEntry: entry,
      draftText: text,
      existingEntries: allEntries || [entry],
    });
  }, [isEditing, entry, text, allEntries]);

  const handleSuggestRewrite = async () => {
    setRewriteLoading(true);
    setRewriteError(null);
    try {
      const res = await fetch(`/api/v1/bank/bullets/${bullet.id}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      const payload = json?.data ?? json;
      if (!res.ok || !payload?.rewrittenText) {
        throw new Error(json?.error?.message || "Could not generate rewrite suggestion.");
      }
      setRewritePreview({
        rewrittenText: payload.rewrittenText,
        hasVerifiedMetric: Boolean(payload.hasVerifiedMetric),
        suggestedMetricQuestion: payload.suggestedMetricQuestion || null,
      });
    } catch (err: any) {
      setRewriteError(err.message || "Failed to suggest rewrite");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleApplyRewrite = async () => {
    if (!rewritePreview) return;
    if (isEditing) {
      setText(rewritePreview.rewrittenText);
      setRewritePreview(null);
      return;
    }
    setLoading(true);
    try {
      await onUpdate({ text: rewritePreview.rewrittenText });
      setRewritePreview(null);
    } finally {
      setLoading(false);
    }
  };

  const appendToolToDraft = (tool: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tool;
      if (entry?.entryType === "skill_group") {
        return trimmed.endsWith(",") ? `${trimmed} ${tool}` : `${trimmed}, ${tool}`;
      }
      return `${trimmed} (${tool})`;
    });
  };

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

              {editSuggestions &&
                (editSuggestions.draftSuggestions.length > 0 ||
                  editSuggestions.vaultContextTools.length > 0 ||
                  editSuggestions.evidencedSkillsToAdd.length > 0 ||
                  editSuggestions.metricHint) && (
                  <div className="rounded border border-rule bg-paper-alt px-2.5 py-2 space-y-1.5">
                    {editSuggestions.evidencedSkillsToAdd.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10.5px] font-medium text-graphite">
                          Evidenced in your vault:
                        </span>
                        {editSuggestions.evidencedSkillsToAdd.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => appendToolToDraft(skill)}
                            className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    )}

                    {editSuggestions.draftSuggestions.map((sug, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-graphite">
                          <strong className="text-ink">{sug.label}:</strong> {sug.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => setText(sug.text)}
                          className="font-medium text-stamp hover:underline shrink-0"
                        >
                          Use phrasing
                        </button>
                      </div>
                    ))}

                    {editSuggestions.vaultContextTools.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10.5px] font-medium text-graphite">
                          From your existing vault:
                        </span>
                        {editSuggestions.vaultContextTools.slice(0, 6).map((tool) => (
                          <button
                            key={tool}
                            type="button"
                            onClick={() => appendToolToDraft(tool)}
                            className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                          >
                            + {tool}
                          </button>
                        ))}
                      </div>
                    )}

                    {editSuggestions.metricHint && (
                      <p className="text-[11px] text-marker-dark">{editSuggestions.metricHint}</p>
                    )}
                  </div>
                )}

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm">
                  {loading ? "Saving" : "Save"}
                </button>
                {entry?.entryType !== "skill_group" && (
                  <button
                    type="button"
                    onClick={handleSuggestRewrite}
                    disabled={rewriteLoading}
                    className="btn btn-sm btn-quiet inline-flex items-center gap-1 text-stamp"
                  >
                    <Wand2 className="h-3 w-3" strokeWidth={1.8} />
                    {rewriteLoading ? "Thinking..." : "Suggest XYZ rewrite"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setText(bullet.text);
                    setRewritePreview(null);
                  }}
                  className="btn btn-sm btn-quiet"
                >
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

          {rewriteError && (
            <p className="mt-1.5 text-[11px] text-alarm">{rewriteError}</p>
          )}

          {rewritePreview && (
            <div className="mt-2 rounded border border-stamp/30 bg-stamp/5 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-stamp inline-flex items-center gap-1">
                  <Wand2 className="h-3 w-3" strokeWidth={1.8} />
                  Truth-bound XYZ suggestion
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyRewrite}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-stamp hover:underline"
                  >
                    <Check className="h-3 w-3" strokeWidth={2} />
                    {isEditing ? "Use in editor" : "Apply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRewritePreview(null)}
                    className="inline-flex items-center gap-0.5 text-[11px] text-graphite hover:text-ink"
                  >
                    <X className="h-3 w-3" strokeWidth={1.8} />
                    Dismiss
                  </button>
                </div>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink">{rewritePreview.rewrittenText}</p>
              {!rewritePreview.hasVerifiedMetric && rewritePreview.suggestedMetricQuestion && (
                <p className="text-[11px] text-graphite">{rewritePreview.suggestedMetricQuestion}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="btn btn-icon disabled:opacity-25"
              title="Move bullet up"
              aria-label="Move bullet up"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="btn btn-icon disabled:opacity-25"
              title="Move bullet down"
              aria-label="Move bullet down"
            >
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
          {entry?.entryType !== "skill_group" && (
            <button
              type="button"
              onClick={handleSuggestRewrite}
              disabled={rewriteLoading}
              className="btn btn-icon"
              title="Suggest truth-bound XYZ rewrite"
              aria-label="Suggest truth-bound XYZ rewrite"
            >
              <Wand2 className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
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
