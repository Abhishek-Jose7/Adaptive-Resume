"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BankEntry, EntryType } from "@/types/bank";
import { X, Sparkles, AlertTriangle } from "lucide-react";
import { getEntryFormSuggestions } from "@/lib/services/vaultSuggestionService";

interface BankEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: BankEntry | null;
  defaultEntryType?: EntryType;
  existingEntries?: BankEntry[];
  onSave: (data: any) => Promise<void>;
}

interface EntryFieldConfig {
  noun: string;
  titleLabel: string;
  titlePlaceholder: string;
  orgLabel?: string;
  orgPlaceholder?: string;
  suggestOrgFromVault?: boolean;
  showLocation?: boolean;
  dateMode: "none" | "single" | "range";
  singleDateLabel?: string;
  currentLabel?: string;
  showTechStack?: boolean;
  techStackLabel?: string;
  techStackPlaceholder?: string;
  bulletsLabel?: string;
  bulletsPlaceholder?: string;
  bulletsAsSkills?: boolean;
  contextLabel: string;
  contextPlaceholder: string;
}

const ENTRY_FORM_CONFIG: Record<EntryType, EntryFieldConfig> = {
  experience: {
    noun: "Work Experience",
    titleLabel: "Role / Job Title *",
    titlePlaceholder: "e.g., Backend Engineering Intern",
    orgLabel: "Company / Organization",
    orgPlaceholder: "e.g., Google, GDG CRCE, Acme Corp",
    suggestOrgFromVault: true,
    showLocation: true,
    dateMode: "range",
    currentLabel: "I currently work here",
    bulletsLabel: "Key Achievements & Responsibilities (one per line)",
    bulletsPlaceholder:
      "Built REST APIs in FastAPI serving 500+ concurrent users at <200ms p95 latency\nAutomated CI checks reducing deployment rollbacks by 40%",
    contextLabel: "Team Context & Scope (optional)",
    contextPlaceholder: "Team size, product domain, tech constraints, or key stakeholders.",
  },
  project: {
    noun: "Project",
    titleLabel: "Project Name *",
    titlePlaceholder: "e.g., ideOS — Cross-IDE Development Continuity Layer",
    orgLabel: "Your Role / Team (optional)",
    orgPlaceholder: "e.g., Solo Builder, Team Lead, Open Source",
    suggestOrgFromVault: false,
    showLocation: false,
    dateMode: "range",
    currentLabel: "Ongoing project",
    showTechStack: true,
    techStackLabel: "Tech Stack / Tools (optional)",
    techStackPlaceholder: "e.g., TypeScript, Next.js, PostgreSQL, Redis",
    bulletsLabel: "Project Highlights & Outcomes (one per line)",
    bulletsPlaceholder:
      "Designed cross-IDE state sync cutting context-switching overhead across sessions\nImplemented incremental indexing over 50k+ files with sub-100ms query latency",
    contextLabel: "Project Overview / Architecture Notes (optional)",
    contextPlaceholder: "Problem solved, architecture decisions, constraints, or live link.",
  },
  education: {
    noun: "Education",
    titleLabel: "Degree & Major *",
    titlePlaceholder: "e.g., B.E. in Computer Engineering",
    orgLabel: "College / University *",
    orgPlaceholder: "e.g., Fr. Conceicao Rodrigues College of Engineering",
    suggestOrgFromVault: true,
    showLocation: true,
    dateMode: "range",
    currentLabel: "Currently enrolled here",
    bulletsLabel: "Coursework / Highlights (optional, one per line)",
    bulletsPlaceholder: "CGPA: 8.9/10\nRelevant coursework: Operating Systems, DBMS, Distributed Systems",
    contextLabel: "Honors, GPA, or Notes (optional)",
    contextPlaceholder: "Honors, societies, or thesis topic.",
  },
  skill_group: {
    noun: "Skill Group",
    titleLabel: "Skill Category Name *",
    titlePlaceholder: "e.g., AI & GenAI or Backend & Databases",
    showLocation: false,
    dateMode: "none",
    bulletsLabel: "Skills in This Group * (comma or newline separated)",
    bulletsPlaceholder: "Python, FastAPI, PostgreSQL, Redis, Docker",
    bulletsAsSkills: true,
    contextLabel: "Additional Notes (optional)",
    contextPlaceholder: "Optional grouping notes.",
  },
  certification: {
    noun: "Certification",
    titleLabel: "Certificate / Credential Title *",
    titlePlaceholder: "e.g., AWS Certified Cloud Practitioner",
    orgLabel: "Issuing Organization",
    orgPlaceholder: "e.g., Coursera, AWS, Google Cloud",
    suggestOrgFromVault: true,
    showLocation: false,
    dateMode: "single",
    singleDateLabel: "Issue Date",
    contextLabel: "Credential ID, Verification URL, or Notes (optional)",
    contextPlaceholder: "Certificate URL, score, or covered topics.",
  },
  award: {
    noun: "Award / Hackathon Win",
    titleLabel: "Award or Hackathon Recognition *",
    titlePlaceholder: "e.g., 1st Place — Smart India Hackathon 2026",
    orgLabel: "Event / Organization (optional)",
    orgPlaceholder: "e.g., PKP Hacks, MLH, IEEE",
    suggestOrgFromVault: false,
    showLocation: false,
    dateMode: "single",
    singleDateLabel: "Date Received",
    bulletsLabel: "What You Built / Recognition Details (optional, one per line)",
    bulletsPlaceholder: "Ranked 1st out of 150 teams for building an AI legal assistant in 24 hours",
    contextLabel: "Competition Context (optional)",
    contextPlaceholder: "Team size, prize category, or project built.",
  },
  publication: {
    noun: "Publication",
    titleLabel: "Paper / Article Title *",
    titlePlaceholder: "e.g., Low-Latency RAG Pipelines for Legal Search",
    orgLabel: "Journal / Conference / Publisher",
    orgPlaceholder: "e.g., IEEE, ACM, arXiv",
    suggestOrgFromVault: false,
    showLocation: false,
    dateMode: "single",
    singleDateLabel: "Publication Date",
    contextLabel: "Abstract / Citation / URL (optional)",
    contextPlaceholder: "DOI, co-authors, or summary of findings.",
  },
  volunteer: {
    noun: "Volunteer Role",
    titleLabel: "Role / Initiative *",
    titlePlaceholder: "e.g., Technical Mentor",
    orgLabel: "Organization / Community",
    orgPlaceholder: "e.g., GDG On Campus, Code for Good",
    suggestOrgFromVault: true,
    showLocation: true,
    dateMode: "range",
    currentLabel: "Currently active here",
    bulletsLabel: "Contributions & Impact (one per line)",
    bulletsPlaceholder: "Mentored 40+ students in full-stack web development workshops",
    contextLabel: "Community Context (optional)",
    contextPlaceholder: "Scope, beneficiaries, or program focus.",
  },
  profile: {
    noun: "Profile / Summary",
    titleLabel: "Summary Heading *",
    titlePlaceholder: "e.g., Professional Summary",
    showLocation: false,
    dateMode: "none",
    contextLabel: "Summary Bio *",
    contextPlaceholder: "Concise 2-3 sentence summary highlighting your engineering focus and strengths.",
  },
  custom: {
    noun: "Custom Entry",
    titleLabel: "Entry Title *",
    titlePlaceholder: "e.g., Open Source Maintainer",
    orgLabel: "Organization / Subtitle (optional)",
    orgPlaceholder: "e.g., Project or Community",
    suggestOrgFromVault: false,
    showLocation: false,
    dateMode: "single",
    singleDateLabel: "Date (optional)",
    bulletsLabel: "Details / Highlights (one per line)",
    bulletsPlaceholder: "Key outcome or detail to save in your Career Vault",
    contextLabel: "Notes (optional)",
    contextPlaceholder: "Supporting details for resume tailoring.",
  },
};

export function BankEntryModal({
  isOpen,
  onClose,
  entryToEdit,
  defaultEntryType = "experience",
  existingEntries = [],
  onSave,
}: BankEntryModalProps) {
  const [entryType, setEntryType] = useState<EntryType>(defaultEntryType);
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [techStackText, setTechStackText] = useState("");
  const [bulletsText, setBulletsText] = useState("");
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
      setTechStackText("");
      setBulletsText("");
    } else {
      setEntryType(defaultEntryType);
      setTitle("");
      setOrganization("");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setIsCurrent(false);
      setDescriptionContext("");
      setVisibility(defaultEntryType === "project" ? "public_eligible" : "private");
      setTechStackText("");
      setBulletsText("");
    }
    setError(null);
  }, [entryToEdit, defaultEntryType, isOpen]);

  const config = ENTRY_FORM_CONFIG[entryType] || ENTRY_FORM_CONFIG.custom;

  const filteredVaultEntries = useMemo(() => {
    // Filter out profile entries so personal name isn't suggested as an organization
    return existingEntries.filter((e) => e.entryType !== "profile");
  }, [existingEntries]);

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
      draftContext: `${techStackText} ${descriptionContext}`,
      editingEntryId: entryToEdit?.id,
      existingEntries: filteredVaultEntries,
    });
  }, [
    isOpen,
    entryType,
    title,
    organization,
    location,
    techStackText,
    descriptionContext,
    entryToEdit?.id,
    filteredVaultEntries,
  ]);

  if (!isOpen) return null;

  const appendTechChip = (tool: string) => {
    if (config.showTechStack) {
      setTechStackText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return tool;
        return trimmed.endsWith(",") ? `${trimmed} ${tool}` : `${trimmed}, ${tool}`;
      });
    } else if (config.bulletsAsSkills) {
      setBulletsText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return tool;
        return trimmed.endsWith(",") ? `${trimmed} ${tool}` : `${trimmed}, ${tool}`;
      });
    } else {
      setDescriptionContext((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return `Used ${tool}.`;
        return `${trimmed}${trimmed.endsWith(".") ? "" : ","} ${tool}`;
      });
    }
  };

  const buildInitialBullets = () => {
    if (entryToEdit) return undefined;

    const prepared: Array<{ text: string; sortOrder: number; visibility: string }> = [];

    if (config.bulletsAsSkills) {
      const tokens = bulletsText
        .split(/[,•|\n;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      tokens.forEach((tok, idx) => {
        prepared.push({ text: tok, sortOrder: idx, visibility });
      });
      return prepared;
    }

    if (config.showTechStack && techStackText.trim()) {
      const stackFormatted = techStackText
        .split(/[,•|\n]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .join(" | ");
      if (stackFormatted) {
        prepared.push({ text: stackFormatted, sortOrder: 0, visibility });
      }
    }

    const lines = bulletsText
      .split(/\r?\n/)
      .map((l) => l.replace(/^[•\-\*]\s+/, "").trim())
      .filter(Boolean);
    for (const line of lines) {
      prepared.push({ text: line, sortOrder: prepared.length, visibility });
    }

    return prepared.length > 0 ? prepared : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(`${config.titleLabel.replace(" *", "")} is required`);
      return;
    }
    if (!entryToEdit && config.bulletsAsSkills && !bulletsText.trim()) {
      setError("Enter at least one skill for this group.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const initialBullets = buildInitialBullets();
      await onSave({
        entryType,
        title: title.trim(),
        organization: config.orgLabel ? organization.trim() || null : null,
        location: config.showLocation ? location.trim() || null : null,
        startDate: config.dateMode !== "none" ? startDate || null : null,
        endDate: config.dateMode === "range" && !isCurrent ? endDate || null : null,
        isCurrent: config.dateMode === "range" ? isCurrent : false,
        descriptionContext: descriptionContext.trim() || null,
        visibility,
        ...(initialBullets ? { bullets: initialBullets } : {}),
        expectedRowVersion: entryToEdit?.rowVersion,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgSuggestions = suggestions.organizations.filter(
    (org) => org.toLowerCase() !== "coursera" || entryType === "certification"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="bg-white rounded-lg shadow-plate w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-ink">
            {entryToEdit ? `Edit ${config.noun}` : `Add ${config.noun}`}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-paper rounded text-graphite" aria-label="Close modal">
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
                Category
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as EntryType)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp bg-white"
              >
                <option value="experience">Experience</option>
                <option value="project">Project</option>
                <option value="education">Education</option>
                <option value="skill_group">Skill Group</option>
                <option value="certification">Certification</option>
                <option value="award">Award / Hackathon</option>
                <option value="volunteer">Volunteer / Activity</option>
                <option value="publication">Publication</option>
                <option value="profile">Profile / Summary</option>
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
              {config.titleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config.titlePlaceholder}
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

          {(config.orgLabel || config.showLocation) && (
            <div className={`grid grid-cols-1 ${config.orgLabel && config.showLocation ? "sm:grid-cols-2" : ""} gap-4`}>
              {config.orgLabel && (
                <div>
                  <label className="block text-xs font-semibold text-ink normal-case mb-1">
                    {config.orgLabel}
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={config.orgPlaceholder}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
                  />
                  {config.suggestOrgFromVault && filteredOrgSuggestions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-graphite">In vault:</span>
                      {filteredOrgSuggestions.map((org) => (
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
              )}

              {config.showLocation && (
                <div>
                  <label className="block text-xs font-semibold text-ink normal-case mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Mumbai, India (or Remote)"
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
              )}
            </div>
          )}

          {config.showTechStack && !entryToEdit && (
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                {config.techStackLabel}
              </label>
              <input
                type="text"
                value={techStackText}
                onChange={(e) => setTechStackText(e.target.value)}
                placeholder={config.techStackPlaceholder}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
          )}

          {!entryToEdit && config.bulletsLabel && (
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                {config.bulletsLabel}
              </label>
              <textarea
                value={bulletsText}
                onChange={(e) => setBulletsText(e.target.value)}
                placeholder={config.bulletsPlaceholder}
                rows={config.bulletsAsSkills ? 3 : 4}
                className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
          )}

          {config.dateMode === "range" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink normal-case mb-1">
                    Start Date {entryType === "project" ? "(optional)" : ""}
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
                    End Date {entryType === "project" ? "(optional)" : ""}
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
                  {config.currentLabel || "Currently active"}
                </label>
              </div>
            </>
          )}

          {config.dateMode === "single" && (
            <div>
              <label className="block text-xs font-semibold text-ink normal-case mb-1">
                {config.singleDateLabel || "Date"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-1/2 border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink normal-case mb-1">
              {config.contextLabel}
            </label>
            <textarea
              value={descriptionContext}
              onChange={(e) => setDescriptionContext(e.target.value)}
              placeholder={config.contextPlaceholder}
              rows={entryType === "profile" ? 4 : 2}
              className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-stamp"
            />

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
                    <span className="text-[11px] text-graphite">
                      {config.showTechStack ? "Add to stack:" : config.bulletsAsSkills ? "Add skill:" : "Add from your vault:"}
                    </span>
                    {suggestions.contextTechHints.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => appendTechChip(tool)}
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
              {loading ? "Saving..." : entryToEdit ? `Update ${config.noun}` : `Save ${config.noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
