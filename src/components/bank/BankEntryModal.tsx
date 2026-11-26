"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BankEntry, EntryType } from "@/types/bank";
import { X, Sparkles, AlertTriangle } from "lucide-react";
import { getEntryFormSuggestions } from "@/lib/services/vaultSuggestionService";

interface BankEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: BankEntry | null;
  existingEntries?: BankEntry[];
  onSave: (data: any) => Promise<void>;
}

export function BankEntryModal({
  isOpen,
  onClose,
  entryToEdit,
  existingEntries = [],
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

  const suggestions = useMemo(() => {
    if (!isOpen) {
      return {
        organizations: [],
        locations: [],
        contextTechHints: [],
        contextPrompts: [],
        similarEntry: null,
      };
    }
    return getEntryFormSuggestions({
      draftType: entryType,
      draftTitle: title,
      draftOrg: organization,
      draftLocation: location,
      draftContext: descriptionContext,
      editingEntryId: entryToEdit?.id,
      existingEntries,
    });
  }, [isOpen, entryType, title, organization, location, descriptionContext, entryToEdit?.id, existingEntries]);

  if (!isOpen) return null;

  const appendContextTech = (tool: string) => {
    setDescriptionContext((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `Used ${tool}.`;
      return `${trimmed}${trimmed.endsWith(".") ? "" : ","} ${tool}`;
    });
  };

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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-alarm border border-alarm text-white text-sm rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {!entryToEdit && suggestions.similarEntry && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-marker-dark">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Similar entry already in your Career Vault:{" "}
                  <strong>{suggestions.similarEntry.title}</strong>
                  {suggestions.similarEntry.organization
                    ? ` (${suggestions.similarEntry.organization})`
                    : ""}
                  . You can edit that card directly or continue adding a separate entry.
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {suggestions.organizations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-graphite">In vault:</span>
                  {suggestions.organizations.map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setOrganization(org)}
                      className="rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                    >
                      {org}
                    </button>
                  ))}
                </div>
              )}
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
              {suggestions.locations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-graphite">In vault:</span>
                  {suggestions.locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className="rounded border border-rule bg-paper-alt px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {(suggestions.contextTechHints.length > 0 || suggestions.contextPrompts.length > 0) && (
              <div className="mt-2 rounded-lg border border-rule bg-paper-alt p-2.5 space-y-1.5">
                {suggestions.contextPrompts[0] && (
                  <p className="text-xs text-ink flex items-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-stamp shrink-0 mt-0.5" />
                    <span>{suggestions.contextPrompts[0]}</span>
                  </p>
                )}
                {suggestions.contextTechHints.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-graphite">Add from your vault:</span>
                    {suggestions.contextTechHints.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => appendContextTech(tool)}
                        className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[11px] text-ink hover:border-stamp hover:text-stamp"
                      >
                        + {tool}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
