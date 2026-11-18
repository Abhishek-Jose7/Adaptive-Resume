"use client";

import React, { useState } from "react";
import { BankEntry, AchievementBullet } from "@/types/bank";
import { BulletEditor } from "./BulletEditor";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Cpu,
  Award,
  Scroll,
  HeartHandshake,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";

interface BankEntryCardProps {
  entry: BankEntry;
  onEdit: (entry: BankEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onAddBullet: (entryId: string, text: string) => Promise<void>;
  onUpdateBullet: (bulletId: string, updated: Partial<AchievementBullet>) => Promise<void>;
  onDeleteBullet: (bulletId: string) => Promise<void>;
  onQuantifyBullet?: (entry: BankEntry, bullet: AchievementBullet) => void;
}

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

  const getTypeIcon = () => {
    switch (entry.entryType) {
      case "experience":
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case "education":
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case "project":
        return <FolderGit2 className="w-4 h-4 text-purple-600" />;
      case "skill_group":
        return <Cpu className="w-4 h-4 text-amber-600" />;
      case "certification":
      case "award":
        return <Award className="w-4 h-4 text-rose-600" />;
      case "publication":
        return <Scroll className="w-4 h-4 text-indigo-600" />;
      case "volunteer":
        return <HeartHandshake className="w-4 h-4 text-teal-600" />;
      default:
        return <Briefcase className="w-4 h-4 text-gray-600" />;
    }
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

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow transition-shadow overflow-hidden">
      {/* Entry Header */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-md border shadow-xs mt-0.5">
            {getTypeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-base">{entry.title}</h3>
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                {entry.entryType.replace("_", " ")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600">
              {entry.organization && (
                <span className="font-medium text-gray-800">{entry.organization}</span>
              )}
              {entry.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  {entry.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                {entry.startDate || "No date"} - {entry.isCurrent ? "Present" : entry.endDate || "Present"}
              </span>
            </div>

            {hasMissingDates && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Missing date details (PRD 6.2 B3)
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-200"
            title="Edit entry"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Free-form Context Notes (PRD Section 6.2 / D-13) */}
      {entry.descriptionContext && (
        <div className="px-4 py-2.5 bg-amber-50/40 border-b text-xs text-gray-700 italic">
          <span className="font-semibold text-amber-800 not-italic">Career Context Note: </span>
          {entry.descriptionContext}
        </div>
      )}

      {/* Atomic Bullets Container */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Atomic Achievement Bullets ({entry.bullets?.length || 0})
          </span>
          <button
            onClick={() => setIsAddingBullet(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Bullet
          </button>
        </div>

        {entry.bullets && entry.bullets.length > 0 ? (
          <div className="space-y-2">
            {entry.bullets.map((bullet) => (
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
          <div className="text-center py-4 border border-dashed rounded text-xs text-gray-400">
            No achievement bullets added yet. Click &ldquo;Add Bullet&rdquo; to add atomic facts.
          </div>
        )}

        {/* Add Bullet Input */}
        {isAddingBullet && (
          <div className="mt-3 p-3 border rounded-md bg-blue-50/30 space-y-2">
            <textarea
              value={newBulletText}
              onChange={(e) => setNewBulletText(e.target.value)}
              placeholder="e.g., Increased pipeline throughput by 40% by migrating database queries to pooled connections..."
              rows={2}
              className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddBulletSubmit}
                disabled={loading || !newBulletText.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Save Bullet"}
              </button>
              <button
                onClick={() => {
                  setIsAddingBullet(false);
                  setNewBulletText("");
                }}
                className="px-3 py-1 border rounded text-xs text-gray-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
