"use client";

import React, { useState } from "react";
import { CircleCheck, CircleAlert, Pencil, Save, X } from "lucide-react";

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

export function StagingReviewTable({ items, onCommitSelected, onRejectItems }: StagingReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.filter((item) => item.status === "pending").map((item) => item.id)),
  );
  const [edits, setEdits] = useState<Record<string, ParsedResumeData>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="proof-empty-state">
        <span className="proof-empty-mark"><CircleCheck size={18} /></span>
        <h2>Nothing to review yet</h2>
        <p>Upload a PDF or DOCX, paste your experience, or connect GitHub. Your details will wait here for your review.</p>
      </div>
    );
  }

  return (
    <section className="proof-review-list" aria-labelledby="staging-title">
      <div className="proof-review-head">
        <div>
          <h2 id="staging-title">Review imported details</h2>
          <p>{items.length} items / Nothing enters your Data Bank until you approve it.</p>
        </div>
        <div className="proof-review-actions">
          <button onClick={() => void handleReject(Array.from(selectedIds))} disabled={loading || selectedIds.size === 0} className="proof-secondary-button">Reject selected</button>
          <button onClick={() => void handleCommit()} disabled={loading || selectedIds.size === 0} className="proof-primary-button">
            <CircleCheck size={16} /> Save {selectedIds.size} to Data Bank
          </button>
        </div>
      </div>

      {error && <p className="proof-review-error" role="alert"><CircleAlert size={16} />{error}</p>}

      <ul className="proof-review-items">
        {items.map((item) => {
          const data = edits[item.id] || item.parsedDataJson;
          const pending = item.status === "pending";
          const isEditing = editingId === item.id;
          return (
            <li key={item.id} className={`proof-review-item ${!pending ? "is-resolved" : selectedIds.has(item.id) ? "is-selected" : ""}`}>
              {pending && <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`Select ${data.title}`} />}
              <div className="proof-review-content">
                <div className="proof-review-title-row">
                  <div className="proof-review-title-group">
                    <h3>{data.title}</h3>
                    <span className="proof-entry-type">{item.entryType.replaceAll("_", " ")}</span>
                    {item.status !== "pending" && <span className={`proof-entry-status ${item.status}`}>{item.status}</span>}
                  </div>
                  <div className="proof-review-item-actions">
                    <span className="proof-confidence">{Math.round(item.confidence * 100)}% match</span>
                    {pending && !isEditing && <button type="button" className="proof-icon-button" onClick={() => { setSelectedIds((current) => new Set(current).add(item.id)); setEditingId(item.id); }} aria-label={`Edit ${data.title}`}><Pencil size={15} /></button>}
                    {pending && <button type="button" className="proof-icon-button proof-reject-icon" onClick={() => void handleReject([item.id])} disabled={loading} aria-label={`Reject ${data.title}`}><X size={16} /></button>}
                  </div>
                </div>

                {isEditing ? (
                  <div className="proof-inline-editor">
                    <label>Title<input value={data.title} onChange={(event) => updateDraft(item.id, { title: event.target.value })} /></label>
                    <div className="proof-edit-grid">
                      <label>Company or organization<input value={data.organization || ""} onChange={(event) => updateDraft(item.id, { organization: event.target.value })} /></label>
                      <label>Location<input value={data.location || ""} onChange={(event) => updateDraft(item.id, { location: event.target.value })} /></label>
                      <label>Start date<input value={data.startDate || ""} onChange={(event) => updateDraft(item.id, { startDate: event.target.value })} placeholder="2022" /></label>
                      <label>End date<input value={data.isCurrent ? "" : data.endDate || ""} disabled={data.isCurrent} onChange={(event) => updateDraft(item.id, { endDate: event.target.value, isCurrent: false })} placeholder="2025" /></label>
                    </div>
                    <label className="proof-current-role"><input type="checkbox" checked={Boolean(data.isCurrent)} onChange={(event) => updateDraft(item.id, { isCurrent: event.target.checked, endDate: event.target.checked ? null : data.endDate })} /> I still work here</label>
                    <label>Details, one per line<textarea rows={4} value={(data.bullets || []).join("\n")} onChange={(event) => updateDraft(item.id, { bullets: event.target.value.split("\n").filter((line) => line.trim()) })} /></label>
                    <div className="proof-inline-editor-actions">
                      <button type="button" className="proof-secondary-button" onClick={() => { setEdits((current) => { const next = { ...current }; delete next[item.id]; return next; }); setEditingId(null); }}>Discard edits</button>
                      <button type="button" className="proof-primary-button" onClick={() => setEditingId(null)}><Save size={15} /> Done editing</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(data.organization || data.location) && <p className="proof-review-meta">{[data.organization, data.location].filter(Boolean).join(" / ")}</p>}
                    {(data.startDate || data.endDate || data.isCurrent) && <p className="proof-review-meta">{data.startDate || ""}{data.startDate && " — "}{data.isCurrent ? "Present" : data.endDate || ""}</p>}
                    {data.bullets && data.bullets.length > 0 && <ul className="proof-review-bullets">{data.bullets.map((bullet, index) => <li key={`${item.id}-${index}`}>{bullet}</li>)}</ul>}
                    {data.descriptionContext && !data.bullets?.length && <p className="proof-review-meta">{data.descriptionContext}</p>}
                    {item.rawSnippet && <details className="proof-source-text"><summary>See text from your file</summary><p>{item.rawSnippet}</p></details>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
