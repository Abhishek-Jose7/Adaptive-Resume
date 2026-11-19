"use client";

import React, { useState, useEffect } from "react";
import { BankEntry, EntryType } from "@/types/bank";
import { X } from "lucide-react";

interface BankEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: BankEntry | null;
  onSave: (data: any) => Promise<void>;
}

export function BankEntryModal({
  isOpen,
  onClose,
  entryToEdit,
  onSave,
}: BankEntryModalProps) {
  const [entryType, setEntryType] = useState<EntryType>("experience");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [descriptionContext, setDescriptionContext] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entryToEdit) {
      setEntryType(entryToEdit.entryType);
      setTitle(entryToEdit.title);
      setOrganization(entryToEdit.organization || "");
      setLocation(entryToEdit.location || "");
      setStartDate(entryToEdit.startDate || "");
      setEndDate(entryToEdit.endDate || "");
      setIsCurrent(entryToEdit.isCurrent);
      setDescriptionContext(entryToEdit.descriptionContext || "");
      setVisibility(entryToEdit.visibility);
    } else {
      setEntryType("experience");
      setTitle("");
      setOrganization("");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setIsCurrent(false);
      setDescriptionContext("");
      setVisibility("private");
    }
    setError(null);
  }, [entryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        entryType,
        title: title.trim(),
        organization: organization.trim() || null,
        location: location.trim() || null,
        startDate: startDate || null,
        endDate: isCurrent ? null : endDate || null,
        isCurrent,
        descriptionContext: descriptionContext.trim() || null,
        visibility,
        expectedRowVersion: entryToEdit?.rowVersion,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="bg-white rounded-lg shadow-plate w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-ink">
            {entryToEdit ? "Edit Career Entry" : "Add Career Entry"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-paper rounded text-graphite">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-alarm border border-alarm text-white text-sm rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                Entry Category
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as EntryType)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp bg-white"
              >
                <option value="profile">Profile / Summary</option>
                <option value="experience">Experience</option>
                <option value="education">Education</option>
                <option value="project">Project</option>
                <option value="skill_group">Skill Group</option>
                <option value="certification">Certification</option>
                <option value="award">Award</option>
                <option value="publication">Publication</option>
                <option value="volunteer">Volunteer / Activity</option>
                <option value="custom">Custom Section</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                Visibility Scope
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp bg-white"
              >
                <option value="private">Private (Default)</option>
                <option value="resume">Resume Eligible</option>
                <option value="public_eligible">Public Profile Eligible</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink normal-case mb-1">
              Title / Role / Degree / Group Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Staff Systems Architect or B.S. in Computer Science"
              className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                Organization / Institution / Company
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., Alphabet / Stanford"
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA (or Remote)"
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                disabled={isCurrent}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp disabled:bg-paper"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded text-stamp focus:ring-stamp"
            />
            <label htmlFor="isCurrent" className="text-sm text-ink">
              I am currently working / enrolled here
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink normal-case mb-1">
              Free-Form Career Context & Situation Note (PRD Section 6.2 D-13)
            </label>
            <textarea
              value={descriptionContext}
              onChange={(e) => setDescriptionContext(e.target.value)}
              placeholder="Background context, team constraints, architectural goals. The AI can use this as truthful evidence when rephrasing bullets."
              rows={3}
              className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
            />
            <p className="text-xs text-graphite mt-1">
              Facts stated here are part of your Data Bank and can be cited as evidence by the truth-bound AI.
            </p>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm text-ink hover:bg-paper font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-stamp text-white rounded-lg text-sm font-medium hover:bg-stamp-dark disabled:opacity-50"
            >
              {loading ? "Saving..." : entryToEdit ? "Update Entry" : "Create Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
