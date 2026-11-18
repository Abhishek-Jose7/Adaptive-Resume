"use client";

import React, { useState } from "react";
import { AchievementBullet, BulletFact } from "@/types/bank";
import { FactBadge } from "./FactBadge";
import { Plus, Trash2, Edit2, ShieldAlert, Pin, Sparkles } from "lucide-react";

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
    <div className="group relative border rounded-lg p-3 bg-white hover:border-gray-300 shadow-xs transition-all text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 border rounded text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-900 leading-relaxed text-xs">{bullet.text}</p>
              {!hasMetrics && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Lacks measurable metric</span>
                  </div>
                  {onQuantify && (
                    <button
                      onClick={() => onQuantify(bullet)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      Quantify with AI Assistant
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Structured Facts */}
          {bullet.facts && bullet.facts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              {bullet.facts.map((fact) => (
                <FactBadge key={fact.id} fact={fact} />
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-gray-400">
          {onQuantify && hasMetrics && (
            <button
              onClick={() => onQuantify(bullet)}
              className="p-1 hover:text-purple-600 rounded hover:bg-purple-50 transition-colors"
              title="Quantification Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:text-gray-900 rounded hover:bg-gray-100 transition-colors"
            title="Edit bullet"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
            title="Delete bullet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
