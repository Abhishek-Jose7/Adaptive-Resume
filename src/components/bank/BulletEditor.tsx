"use client";

import React, { useState } from "react";
import { AchievementBullet, BulletFact } from "@/types/bank";
import { FactBadge } from "./FactBadge";
import { Plus, Trash2, Edit2, ShieldAlert, Pin } from "lucide-react";

interface BulletEditorProps {
  bullet: AchievementBullet;
  onUpdate: (updated: Partial<AchievementBullet>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function BulletEditor({ bullet, onUpdate, onDelete }: BulletEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [loading, setLoading] = useState(false);

  const hasMetrics = bullet.facts?.some((f) => f.factType === "metric" || f.valueNumber != null) || /\d/.test(bullet.text);

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
    <div className="group relative border rounded-md p-3 bg-white hover:border-gray-400 transition-all text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
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
              <p className="text-gray-900 leading-relaxed">{bullet.text}</p>
              {!hasMetrics && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Missing quantifiable metric or impact (PRD 6.2 B3)</span>
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
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-gray-500">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:text-gray-900 rounded hover:bg-gray-100"
            title="Edit bullet"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:text-red-600 rounded hover:bg-red-50"
            title="Delete bullet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
