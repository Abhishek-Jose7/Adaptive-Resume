"use client";

import React, { useState } from "react";
import { FileUploadDropzone } from "@/components/intake/FileUploadDropzone";
import { PasteTextInput } from "@/components/intake/PasteTextInput";
import { GitHubImportModal } from "@/components/intake/GitHubImportModal";
import { StagingReviewTable, StagedItemView } from "@/components/intake/StagingReviewTable";
import { FolderGit2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invalidateVaultCache } from "@/lib/cache/vaultClientCache";

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
      const batchRes = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceLabel }),
      });
      if (!batchRes.ok) {
        const payload = await batchRes.json().catch(() => null);
        const apiError = payload?.error;
        const detail = apiError?.message || "We couldn’t start the import.";
        const request = apiError?.requestId ? ` Support reference: ${apiError.requestId}.` : "";
        throw new Error(`${detail}${request}`);
      }
      const { batchId } = await batchRes.json();
      setCurrentBatchId(batchId);

      const parseRes = await fetch(`/api/v1/imports/${batchId}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!parseRes.ok) {
        const payload = await parseRes.json().catch(() => null);
        const support = payload?.error?.requestId ? ` Support reference: ${payload.error.requestId}.` : "";
        throw new Error(`${payload?.error?.message || "We couldn’t read the imported details."}${support}`);
      }
      const parseData = await parseRes.json();
      if (parseData.items && parseData.items.length > 0) {
        setStagedItems(parseData.items);
      } else {
        const reviewRes = await fetch(`/api/v1/imports/${batchId}`);
        if (!reviewRes.ok) {
          const payload = await reviewRes.json().catch(() => null);
          throw new Error(payload?.error?.message || "We couldn’t load the details for review.");
        }
        const data = await reviewRes.json();
        setStagedItems(data.items || []);
      }

      setMessage(`Staged ${items.length} candidate items from ${sourceLabel}. Review them below.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Import processing failed.");
      throw err;
    }
  };

  const handleCommitSelected = async (accepted: Array<{ stagedItemId: string; overrideData?: Partial<StagedItemView["parsedDataJson"]> }>) => {
    if (!currentBatchId) return;

    try {
      const res = await fetch(`/api/v1/imports/${currentBatchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedItems: accepted }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error?.message || "Couldn’t save those details. Please try again.");
      const result = payload;
      invalidateVaultCache();

      setMessage(`Saved ${result.committedCount} experience details.`);
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
      throw err;
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
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/bank"
            className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-graphite hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Your experience
          </Link>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
            Add experience
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
            Upload a resume or add details yourself. Review everything before it is saved.
          </p>
        </div>

        <button
          onClick={() => setIsGitHubModalOpen(true)}
          className="btn self-start sm:self-auto"
        >
          <FolderGit2 className="h-4 w-4" strokeWidth={1.8} />
          Pull from GitHub
        </button>
      </header>

      {message && (
        <div className="mb-4 flex items-start gap-2 border border-press/30 bg-press-soft px-3 py-2 text-[12.5px] text-press">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 border border-alarm/35 bg-alarm-soft px-3 py-2 text-[12.5px] text-alarm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FileUploadDropzone onParsedItemsReady={handleParsedItemsReady} />
        <PasteTextInput onParsedItemsReady={handleParsedItemsReady} />
      </div>

      <div className="mt-6">
        <StagingReviewTable
          items={stagedItems}
          onCommitSelected={handleCommitSelected}
          onRejectItems={handleRejectItems}
        />
      </div>

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
