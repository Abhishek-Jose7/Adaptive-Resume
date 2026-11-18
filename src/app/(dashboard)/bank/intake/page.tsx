"use client";

import React, { useState } from "react";
import { FileUploadDropzone } from "@/components/intake/FileUploadDropzone";
import { PasteTextInput } from "@/components/intake/PasteTextInput";
import { GitHubImportModal } from "@/components/intake/GitHubImportModal";
import { StagingReviewTable, StagedItemView } from "@/components/intake/StagingReviewTable";
import {
  UploadCloud,
  FolderGit2,
  Database,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DataIntakePage() {
  const router = useRouter();
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [stagedItems, setStagedItems] = useState<StagedItemView[]>([]);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleParsedItemsReady = async (
    sourceType: string,
    sourceLabel: string,
    items: any[]
  ) => {
    setMessage(null);
    setErrorMessage(null);

    try {
      // 1. Create Batch
      const batchRes = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceLabel }),
      });
      if (!batchRes.ok) throw new Error("Failed to create import batch");
      const { batchId } = await batchRes.json();
      setCurrentBatchId(batchId);

      // 2. Stage Parsed Candidates
      const parseRes = await fetch(`/api/v1/imports/${batchId}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!parseRes.ok) throw new Error("Failed to stage parsed items");

      // 3. Fetch Staged Items for Review
      const reviewRes = await fetch(`/api/v1/imports/${batchId}`);
      if (!reviewRes.ok) throw new Error("Failed to load staged items");
      const data = await reviewRes.json();
      setStagedItems(data.items || []);

      setMessage(`Staged ${items.length} candidate items from ${sourceLabel}. Review and accept below.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Import processing failed.");
    }
  };

  const handleCommitSelected = async (accepted: Array<{ stagedItemId: string }>) => {
    if (!currentBatchId) return;

    try {
      const res = await fetch(`/api/v1/imports/${currentBatchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedItems: accepted }),
      });

      if (!res.ok) throw new Error("Failed to commit items to Data Bank.");
      const result = await res.json();

      setMessage(`Successfully committed ${result.committedCount} items into your Data Bank!`);
      // Update local staged items
      setStagedItems((prev) =>
        prev.map((item) =>
          accepted.some((a) => a.stagedItemId === item.id)
            ? { ...item, status: "accepted" }
            : item
        )
      );

      setTimeout(() => {
        router.push("/bank");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleRejectItems = async (itemIds: string[]) => {
    if (!currentBatchId || itemIds.length === 0) return;

    try {
      const res = await fetch(`/api/v1/imports/${currentBatchId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagedItemIds: itemIds }),
      });

      if (!res.ok) throw new Error("Failed to reject items.");
      setStagedItems((prev) =>
        prev.map((item) =>
          itemIds.includes(item.id) ? { ...item, status: "rejected" } : item
        )
      );
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <Link
            href="/bank"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Data Bank
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Data Bank Intake &amp; Staging
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Import existing resumes, LinkedIn exports, or GitHub repositories into the staging area before committing.
          </p>
        </div>

        <button
          onClick={() => setIsGitHubModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 shadow-xs"
        >
          <FolderGit2 className="w-4 h-4" />
          GitHub Repo Import
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Intake Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUploadDropzone onParsedItemsReady={handleParsedItemsReady} />
        <PasteTextInput onParsedItemsReady={handleParsedItemsReady} />
      </div>

      {/* Staging Review Area */}
      <StagingReviewTable
        items={stagedItems}
        onCommitSelected={handleCommitSelected}
        onRejectItems={handleRejectItems}
      />

      {/* GitHub Import Modal */}
      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onReposSelected={(items) =>
          handleParsedItemsReady("github", "GitHub Repositories", items)
        }
      />
    </div>
  );
}
