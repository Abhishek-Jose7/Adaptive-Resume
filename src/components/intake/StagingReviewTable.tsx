"use client";

import React, { useState } from "react";
import { Check, X, Edit, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";

export interface StagedItemView {
  id: string;
  batchId: string;
  entryType: string;
  rawSnippet: string | null;
  parsedDataJson: {
    title: string;
    organization?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    descriptionContext?: string | null;
    bullets?: string[];
  };
  confidence: number;
  status: string;
}

interface StagingReviewTableProps {
  items: StagedItemView[];
  onCommitSelected: (accepted: Array<{ stagedItemId: string; overrideData?: any }>) => Promise<void>;
  onRejectItems: (itemIds: string[]) => Promise<void>;
}

export function StagingReviewTable({
  items,
  onCommitSelected,
  onRejectItems,
}: StagingReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.filter((i) => i.status === "pending").map((i) => i.id))
  );
  const [loading, setLoading] = useState(false);

  const pendingItems = items.filter((i) => i.status === "pending");

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCommit = async () => {
    const toCommit = Array.from(selectedIds).map((id) => ({
      stagedItemId: id,
    }));
    if (toCommit.length === 0) return;

    setLoading(true);
    try {
      await onCommitSelected(toCommit);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSingle = async (id: string) => {
    setLoading(true);
    try {
      await onRejectItems([id]);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="border border-dashed rounded-xl p-8 text-center bg-white text-xs text-gray-400">
        No candidate items in the staging area. Upload a file, paste text, or import GitHub repos above to review.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-xs overflow-hidden space-y-4">
      <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            Staging Review Area ({items.length} items)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Per PRD R-07, verify and edit parsed career items before committing them into your canonical Data Bank.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRejectItems(Array.from(selectedIds))}
            disabled={loading || selectedIds.size === 0}
            className="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            Reject Selected
          </button>
          <button
            onClick={handleCommit}
            disabled={loading || selectedIds.size === 0}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Commit {selectedIds.size} Selected to Bank
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isPending = item.status === "pending";

          return (
            <div
              key={item.id}
              className={`p-4 transition-colors ${
                !isPending
                  ? "bg-gray-50 opacity-60"
                  : isSelected
                  ? "bg-blue-50/20"
                  : "bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {isPending && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded text-blue-600 mt-1 cursor-pointer"
                  />
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {item.parsedDataJson.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-700">
                        {item.entryType}
                      </span>
                      {item.status !== "pending" && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.status === "accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">
                        Confidence: {(item.confidence * 100).toFixed(0)}%
                      </span>
                      {isPending && (
                        <button
                          onClick={() => handleRejectSingle(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Reject this item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {item.parsedDataJson.organization && (
                    <p className="text-xs text-gray-600 font-medium">
                      {item.parsedDataJson.organization}
                      {item.parsedDataJson.location && ` • ${item.parsedDataJson.location}`}
                    </p>
                  )}

                  {/* Snippet / provenance */}
                  {item.rawSnippet && (
                    <p className="text-[11px] text-gray-400 italic font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                      Provenance Snippet: {item.rawSnippet}
                    </p>
                  )}

                  {/* Parsed Bullets Preview */}
                  {item.parsedDataJson.bullets && item.parsedDataJson.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                      {item.parsedDataJson.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
