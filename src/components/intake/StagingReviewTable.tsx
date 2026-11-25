"use client";

import React, { useState } from "react";
import { CircleCheck, CircleAlert, Pencil, Save, X, CheckSquare, Square, ChevronDown } from "lucide-react";

type ParsedResumeData = {
  title: string;
  organization?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  descriptionContext?: string | null;
  bullets?: string[];
};

export interface StagedItemView {
  id: string;
  batchId: string;
  entryType: string;
  rawSnippet: string | null;
  parsedDataJson: ParsedResumeData;
  confidence: number;
  status: string;
}

type AcceptedItem = { stagedItemId: string; overrideData?: Partial<ParsedResumeData> };

interface StagingReviewTableProps {
  items: StagedItemView[];
  onCommitSelected: (accepted: AcceptedItem[]) => Promise<void>;
  onRejectItems: (itemIds: string[]) => Promise<void>;
}

function getBadgeStyle(entryType: string, title?: string) {
  if (entryType === "profile" && /personal\s*details|contact/i.test(title || "")) {
    return "bg-[#d8c49b] text-[#10241c] border-[#c4b087]";
  }
  switch (entryType) {
    case "experience":
      return "bg-[#dce5df] text-[#10241c] border-[#becbbf]";
    case "project":
      return "bg-[#a98452] text-white border-[#8f6e40]";
    case "skill_group":
      return "bg-[#d8c49b] text-[#10241c] border-[#c4b087]";
    case "education":
      return "bg-[#aebbb2] text-[#10241c] border-[#9ba89f]";
    default:
      return "bg-[#eee9df] text-[#10241c] border-[rgba(16,36,28,0.2)]";
  }
}

const CATEGORY_CONFIG: Array<{
  key: string;
  label: string;
  match: (item: StagedItemView) => boolean;
}> = [
  { key: "personal_details", label: "Personal Details", match: (i) => i.entryType === "profile" && /personal\s*details|contact/i.test(i.parsedDataJson?.title || "") },
  { key: "profile", label: "Professional Summary", match: (i) => i.entryType === "profile" && !/personal\s*details|contact/i.test(i.parsedDataJson?.title || "") },
  { key: "experience", label: "Work Experience", match: (i) => i.entryType === "experience" || i.entryType === "volunteer" },
  { key: "project", label: "Projects & Production Builds", match: (i) => i.entryType === "project" },
  { key: "skill_group", label: "Technical & Core Skills", match: (i) => i.entryType === "skill_group" || i.entryType === "skill" },
  { key: "education", label: "Education", match: (i) => i.entryType === "education" },
  { key: "certification", label: "Certifications", match: (i) => i.entryType === "certification" },
  { key: "award", label: "Awards & Honors", match: (i) => i.entryType === "award" || i.entryType === "publication" },
];

export function StagingReviewTable({ items, onCommitSelected, onRejectItems }: StagingReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.filter((item) => item.status === "pending").map((item) => item.id)),
  );
  const [edits, setEdits] = useState<Record<string, ParsedResumeData>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingItems = items.filter((item) => item.status === "pending");
  const allSelected = pendingItems.length > 0 && pendingItems.every((item) => selectedIds.has(item.id));

  // Group items by category to keep similar details together
  const groupedCategories = React.useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      items: StagedItemView[];
    }> = [];
    const seen = new Set<string>();

    for (const cat of CATEGORY_CONFIG) {
      const catItems = items.filter((item) => cat.match(item));
      if (catItems.length > 0) {
        catItems.forEach((i) => seen.add(i.id));
        groups.push({
          key: cat.key,
          label: cat.label,
          items: catItems,
        });
      }
    }

    const leftovers = items.filter((item) => !seen.has(item.id));
    if (leftovers.length > 0) {
      groups.push({
        key: "other",
        label: "Additional Information",
        items: leftovers,
      });
    }

    return groups;
  }, [items]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((item) => item.id)));
    }
  };

  const toggleGroupSelect = (groupItems: StagedItemView[]) => {
    const pendingGroupIds = groupItems.filter((i) => i.status === "pending").map((i) => i.id);
    if (pendingGroupIds.length === 0) return;
    const allGroupSelected = pendingGroupIds.every((id) => selectedIds.has(id));

    setSelectedIds((current) => {
      const next = new Set(current);
      if (allGroupSelected) {
        pendingGroupIds.forEach((id) => next.delete(id));
      } else {
        pendingGroupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateDraft = (id: string, update: Partial<ParsedResumeData>) => {
    const original = items.find((item) => item.id === id)?.parsedDataJson;
    if (!original) return;
    setEdits((current) => ({ ...current, [id]: { ...(current[id] || original), ...update } }));
  };

  const handleCommit = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      await onCommitSelected(Array.from(selectedIds).map((stagedItemId) => ({
        stagedItemId,
        ...(edits[stagedItemId] ? { overrideData: edits[stagedItemId] } : {}),
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save these details. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (ids: string[]) => {
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await onRejectItems(ids);
      setSelectedIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t reject these details. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded border border-[rgba(16,36,28,0.17)] bg-[#faf8f2] p-10 text-center">
        <CircleCheck className="mx-auto h-8 w-8 text-[#315849]" strokeWidth={1.7} />
        <h3 className="mt-3 font-serif text-lg font-bold text-[#10241c]">Nothing to review yet</h3>
        <p className="mt-1 text-[13.5px] text-[#536259]">
          Upload a resume or paste your text above. Your parsed details will appear here for your review and approval.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-8 space-y-4" aria-labelledby="staging-title">
      {/* Sticky Review Action Bar */}
      <div className="sticky top-2 z-20 flex flex-col gap-4 rounded border border-[rgba(16,36,28,0.17)] bg-[#faf8f2]/95 backdrop-blur-md p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#a98452]">
            STAGING AREA · REVIEW CANDIDATES
          </span>
          <h2 id="staging-title" className="mt-0.5 font-serif text-xl font-bold text-[#10241c]">
            Review imported details
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#536259]">
            {items.length} items extracted across {groupedCategories.length} categories. Check items to keep in your permanent Career Vault.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 rounded border border-[rgba(16,36,28,0.2)] bg-white px-3 py-2 text-xs font-bold text-[#10241c] hover:bg-[#eee9df] transition-colors"
          >
            {allSelected ? <CheckSquare className="h-4 w-4 text-[#10241c]" /> : <Square className="h-4 w-4 text-[#536259]" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          <button
            type="button"
            onClick={() => void handleReject(Array.from(selectedIds))}
            disabled={loading || selectedIds.size === 0}
            className="inline-flex items-center gap-1.5 rounded border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            <X className="h-4 w-4" /> Reject selected
          </button>

          <button
            type="button"
            onClick={() => void handleCommit()}
            disabled={loading || selectedIds.size === 0}
            className="inline-flex items-center gap-1.5 rounded bg-[#10241c] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#eee9df] hover:opacity-90 disabled:opacity-40 shadow-sm transition-all"
          >
            <CircleCheck className="h-4 w-4" /> Save {selectedIds.size} to Career Vault
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dedicated Scrollable Container for Staged Items */}
      <div className="max-h-[640px] overflow-y-auto pr-1 space-y-6 rounded-lg border border-[rgba(16,36,28,0.18)] bg-[#f7f5ee] p-4 shadow-inner">
        {groupedCategories.map((group) => {
          const groupPending = group.items.filter((i) => i.status === "pending");
          const groupAllSelected = groupPending.length > 0 && groupPending.every((i) => selectedIds.has(i.id));

          return (
            <div key={group.key} className="space-y-3">
              {/* Category Header */}
              <div className="sticky top-0 z-10 -mx-1 -mt-1 flex items-center justify-between rounded border border-[rgba(16,36,28,0.12)] bg-[#ece7dd]/95 px-3.5 py-2 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#10241c]">
                    {group.label}
                  </span>
                  <span className="rounded bg-[#10241c]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#10241c]">
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                {groupPending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleGroupSelect(group.items)}
                    className="text-[11px] font-bold text-[#a98452] hover:text-[#10241c] hover:underline cursor-pointer transition-colors"
                  >
                    {groupAllSelected ? "Deselect category" : "Select category"}
                  </button>
                )}
              </div>

              {/* Cards in this Category */}
              <div className="space-y-3.5">
                {group.items.map((item) => {
          const data = edits[item.id] || item.parsedDataJson;
          const pending = item.status === "pending";
          const isSelected = selectedIds.has(item.id);
          const isEditing = editingId === item.id;
          const isSkillGroup = item.entryType === "skill_group";

          return (
            <div
              key={item.id}
              className={`rounded border transition-all ${
                isSelected
                  ? "border-[#10241c] bg-[#faf8f2] shadow-[0_2px_8px_rgba(16,36,28,0.06)] ring-1 ring-[#10241c]/20"
                  : "border-[rgba(16,36,28,0.15)] bg-white opacity-80"
              } p-5`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Checkbox and Header Info */}
                <div className="flex items-start gap-3.5">
                  {pending && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${data.title}`}
                      className="mt-1 h-4 w-4 rounded border-[rgba(16,36,28,0.3)] text-[#10241c] accent-[#10241c] cursor-pointer"
                    />
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(item.entryType, data.title)}`}>
                        {item.entryType === "profile" && /personal\s*details|contact/i.test(data.title) ? "personal details" : item.entryType.replaceAll("_", " ")}
                      </span>
                      <span className="rounded bg-[#dce5df] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#315849]">
                        {Math.round(item.confidence * 100)}% match
                      </span>
                      {item.status !== "pending" && (
                        <span className="rounded bg-[#eee9df] px-2 py-0.5 font-mono text-[10px] font-bold text-[#10241c]">
                          {item.status}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-[16.5px] font-bold tracking-tight text-[#10241c]">
                      {data.title}
                    </h3>

                    {(data.organization || data.location) && (
                      <p className="mt-0.5 text-[13px] font-medium text-[#536259]">
                        {[data.organization, data.location].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    {(() => {
                      const isWorkOrEdu = item.entryType === "experience" || item.entryType === "education" || item.entryType === "volunteer";
                      if (data.startDate && data.endDate) {
                        return (
                          <p className="mt-0.5 font-mono text-[11.5px] text-[#7d847f]">
                            {data.startDate} — {data.endDate}
                          </p>
                        );
                      }
                      if (data.startDate && data.isCurrent && isWorkOrEdu) {
                        return (
                          <p className="mt-0.5 font-mono text-[11.5px] text-[#7d847f]">
                            {data.startDate} — Present
                          </p>
                        );
                      }
                      if (data.startDate) {
                        return (
                          <p className="mt-0.5 font-mono text-[11.5px] text-[#7d847f]">
                            {data.startDate}
                          </p>
                        );
                      }
                      if (data.endDate) {
                        return (
                          <p className="mt-0.5 font-mono text-[11.5px] text-[#7d847f]">
                            {data.endDate}
                          </p>
                        );
                      }
                      if (data.isCurrent && isWorkOrEdu) {
                        return (
                          <p className="mt-0.5 font-mono text-[11.5px] text-[#7d847f]">
                            Present
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Edit / Delete Icon Actions */}
                <div className="flex items-center gap-1.5">
                  {pending && !isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds((current) => new Set(current).add(item.id));
                        setEditingId(item.id);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[rgba(16,36,28,0.18)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10241c] hover:bg-[#eee9df] transition-colors"
                      aria-label={`Edit ${data.title}`}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                  {pending && (
                    <button
                      type="button"
                      onClick={() => void handleReject([item.id])}
                      disabled={loading}
                      className="inline-flex items-center gap-1 rounded border border-[rgba(16,36,28,0.18)] bg-white px-2 py-1 text-[11px] font-semibold text-[#7d847f] hover:border-red-300 hover:text-red-700 transition-colors"
                      aria-label={`Reject ${data.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Mode Form */}
              {isEditing ? (
                <div className="mt-4 space-y-3.5 rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">Title</label>
                      <input
                        value={data.title}
                        onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                        className="w-full h-9 px-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">Company / Organization</label>
                      <input
                        value={data.organization || ""}
                        onChange={(event) => updateDraft(item.id, { organization: event.target.value })}
                        className="w-full h-9 px-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">Location</label>
                      <input
                        value={data.location || ""}
                        onChange={(event) => updateDraft(item.id, { location: event.target.value })}
                        className="w-full h-9 px-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">Start Date</label>
                        <input
                          value={data.startDate || ""}
                          onChange={(event) => updateDraft(item.id, { startDate: event.target.value })}
                          placeholder="e.g. 2023"
                          className="w-full h-9 px-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">End Date</label>
                        <input
                          value={data.isCurrent ? "" : data.endDate || ""}
                          disabled={data.isCurrent}
                          onChange={(event) => updateDraft(item.id, { endDate: event.target.value, isCurrent: false })}
                          placeholder="e.g. 2026"
                          className="w-full h-9 px-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#10241c]">
                    <input
                      type="checkbox"
                      checked={Boolean(data.isCurrent)}
                      onChange={(event) => updateDraft(item.id, { isCurrent: event.target.checked, endDate: event.target.checked ? null : data.endDate })}
                      className="rounded border-[rgba(16,36,28,0.2)] accent-[#10241c]"
                    />
                    I still work or study here
                  </label>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#10241c] mb-1">
                      Details / Bullets (one per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(data.bullets || []).join("\n")}
                      onChange={(event) => updateDraft(item.id, { bullets: event.target.value.split("\n").filter((line) => line.trim()) })}
                      className="w-full p-3 rounded border border-[rgba(16,36,28,0.2)] bg-white font-mono text-[12px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEdits((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });
                        setEditingId(null);
                      }}
                      className="rounded border border-[rgba(16,36,28,0.2)] bg-white px-3 py-1.5 text-xs font-bold text-[#536259] hover:bg-[#eee9df]"
                    >
                      Discard edits
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1.5 rounded bg-[#10241c] px-3.5 py-1.5 text-xs font-bold text-[#eee9df]"
                    >
                      <Save className="h-3.5 w-3.5" /> Done editing
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Body Content */
                <div className="mt-3.5 pl-7 border-t border-[rgba(16,36,28,0.08)] pt-3">
                  {/* Skill Group formatted as pills */}
                  {isSkillGroup && data.bullets && data.bullets.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.bullets.map((bullet, idx) => (
                        <span
                          key={`${item.id}-${idx}`}
                          className="inline-flex items-center rounded border border-[rgba(16,36,28,0.15)] bg-white px-2.5 py-1 text-xs font-semibold text-[#10241c] shadow-2xs"
                        >
                          {bullet}
                        </span>
                      ))}
                    </div>
                  ) : (
                    /* Regular Bullets List */
                    data.bullets && data.bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {data.bullets.map((bullet, idx) => (
                          <li key={`${item.id}-${idx}`} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[#10241c]">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a98452]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}

                  {/* Narrative description if no bullets */}
                  {data.descriptionContext && (!data.bullets || data.bullets.length === 0) && (
                    <p className="text-[13.5px] leading-relaxed text-[#384d43]">
                      {data.descriptionContext}
                    </p>
                  )}

                  {/* Raw Text Accordion */}
                  {item.rawSnippet && (
                    <details className="mt-3 group">
                      <summary className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#7d847f] hover:text-[#10241c] cursor-pointer">
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                        See text from your file
                      </summary>
                      <div className="mt-2 rounded border border-[rgba(16,36,28,0.1)] bg-[#f3f0e7] p-3 text-[11.5px] font-mono leading-relaxed text-[#384d43] whitespace-pre-wrap">
                        {item.rawSnippet}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
