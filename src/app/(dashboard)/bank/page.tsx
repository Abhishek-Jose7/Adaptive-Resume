"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BankEntry, CompletenessReport, EntryType, AchievementBullet } from "@/types/bank";
import { BankEntryCard } from "@/components/bank/BankEntryCard";
import { BankEntryModal } from "@/components/bank/BankEntryModal";
import { CompletenessWarning } from "@/components/bank/CompletenessWarning";
import { DuplicateDetectorModal } from "@/components/bank/DuplicateDetectorModal";
import { CareerGraphView } from "@/components/career/CareerGraphView";
import { QuantificationAssistantModal } from "@/components/quantification/QuantificationAssistantModal";
import { Plus, Search, Copy, RefreshCw, UploadCloud, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { compareReverseChronological } from "@/lib/utils/resumeOrderUtils";

export default function DataBankPage() {
  const [viewMode, setViewMode] = useState<"facts" | "graph">("facts");
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [vaultEntries, setVaultEntries] = useState<BankEntry[]>([]);
  const [completeness, setCompleteness] = useState<CompletenessReport>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<BankEntry | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<any>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Quantification Assistant modal state
  const [isQuantifyOpen, setIsQuantifyOpen] = useState(false);
  const [quantifyTarget, setQuantifyTarget] = useState<{
    entry: BankEntry;
    bullet: AchievementBullet;
  } | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("entryType", selectedType);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/v1/bank/entries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load entries");
      const data = await res.json();
      const rawItems: BankEntry[] = data.items || [];
      const items = [...rawItems].sort((a, b) => compareReverseChronological(a, b));
      setEntries(items);
      if (selectedType === "all" && !searchQuery.trim()) {
        setVaultEntries(items);
      } else {
        fetch("/api/v1/bank/entries")
          .then((r) => (r.ok ? r.json() : null))
          .then((allData) => {
            if (allData?.items) setVaultEntries(allData.items);
          })
          .catch(() => {});
      }
      setCompleteness(data.completeness);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries();
  };

  const handleSaveEntry = async (data: any) => {
    if (entryToEdit) {
      const res = await fetch(`/api/v1/bank/entries/${entryToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update entry");
    } else {
      const res = await fetch("/api/v1/bank/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entry");
    }
    await fetchEntries();
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    const res = await fetch(`/api/v1/bank/entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotification("Entry deleted. Every resume built from it will ask again.");
      setTimeout(() => setNotification(null), 4000);
      await fetchEntries();
    } else {
      setNotification("Could not delete entry. Please try again.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddBullet = async (entryId: string, text: string) => {
    const res = await fetch(`/api/v1/bank/entries/${entryId}/bullets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      await fetchEntries();
    } else {
      setNotification("Could not add bullet. Please try again.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleUpdateBullet = async (bulletId: string, updated: any) => {
    let expectedRowVersion = 1;
    for (const e of entries) {
      const found = e.bullets?.find((b) => b.id === bulletId);
      if (found) {
        expectedRowVersion = found.rowVersion;
        break;
      }
    }

    const res = await fetch(`/api/v1/bank/bullets/${bulletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, expectedRowVersion }),
    });
    if (res.ok) {
      await fetchEntries();
    }
  };

  const handleDeleteBullet = async (bulletId: string) => {
    const res = await fetch(`/api/v1/bank/bullets/${bulletId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchEntries();
    }
  };

  const handleReorderBullets = async (entryId: string, bulletIds: string[]) => {
    const res = await fetch(`/api/v1/bank/entries/${entryId}/bullets/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulletIds }),
    });
    if (res.ok) {
      await fetchEntries();
    }
  };

  const handleDetectDuplicates = async () => {
    const res = await fetch("/api/v1/bank/entries/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detect_duplicates" }),
    });
    if (res.ok) {
      const data = await res.json();
      setDuplicateReport(data);
      setIsDuplicateModalOpen(true);
    }
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "experience", label: "Experience" },
    { id: "education", label: "Education" },
    { id: "project", label: "Projects" },
    { id: "skill_group", label: "Skills" },
    { id: "certification", label: "Certifications" },
    { id: "award", label: "Awards" },
    { id: "volunteer", label: "Volunteer" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
            Your experience
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
            Keep your work, projects, education, and skills together. Reuse the details that fit each job.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleDetectDuplicates} className="btn btn-sm">
            <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
            Find duplicates
          </button>
          <Link href="/bank/intake" className="btn btn-sm">
            <UploadCloud className="h-3.5 w-3.5" strokeWidth={1.7} />
            Import
          </Link>
          <button
            onClick={() => {
              setEntryToEdit(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={1.9} />
            New entry
          </button>
        </div>
      </header>

      {notification && (
        <div className="mb-4 flex items-start gap-2 border border-press/30 bg-press-soft px-3 py-2 text-[12.5px] text-press">
          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>{notification}</span>
        </div>
      )}

      <Tabs
        value={viewMode}
        onChange={(id) => setViewMode(id as "facts" | "graph")}
        items={[
          { id: "facts", label: "Facts", count: entries.length || undefined },
          { id: "graph", label: "Career graph" },
        ]}
        className="mb-5"
      >

      {viewMode === "graph" ? (
        <CareerGraphView />
      ) : (
        <div className="space-y-5">
          <CompletenessWarning report={completeness} />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedType(c.id)}
                  className="chip"
                  data-active={selectedType === c.id}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative lg:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the record"
                className="input pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-graphite" strokeWidth={1.8} />
            </form>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-graphite">
              <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
              Reading your records
            </div>
          ) : entries.length === 0 ? (
            <div className="panel px-6 py-14 text-center">
              <h3 className="font-display text-[18px] font-semibold">Your experience will show up here</h3>
              <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-graphite">
                Add a past role or import a resume you already trust. You can update these details whenever you like.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setEntryToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-primary"
                >
                  Add the first entry
                </button>
                <Link href="/bank/intake" className="btn">
                  Import a resume
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <BankEntryCard
                  key={entry.id}
                  entry={entry}
                  allEntries={vaultEntries.length > 0 ? vaultEntries : entries}
                  onEdit={(e) => {
                    setEntryToEdit(e);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteEntry}
                  onAddBullet={handleAddBullet}
                  onUpdateBullet={handleUpdateBullet}
                  onDeleteBullet={handleDeleteBullet}
                  onReorderBullets={handleReorderBullets}
                  onQuantifyBullet={(e, bullet) => {
                    setQuantifyTarget({ entry: e, bullet });
                    setIsQuantifyOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </Tabs>

      <BankEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entryToEdit={entryToEdit}
        existingEntries={vaultEntries.length > 0 ? vaultEntries : entries}
        onSave={handleSaveEntry}
      />

      <DuplicateDetectorModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        duplicates={duplicateReport}
      />

      {quantifyTarget && (
        <QuantificationAssistantModal
          isOpen={isQuantifyOpen}
          onClose={() => {
            setIsQuantifyOpen(false);
            setQuantifyTarget(null);
          }}
          entryId={quantifyTarget.entry.id}
          bulletId={quantifyTarget.bullet.id}
          initialText={quantifyTarget.bullet.text}
          context={quantifyTarget.entry.descriptionContext || quantifyTarget.entry.title}
          onBulletUpdated={fetchEntries}
        />
      )}
    </div>
  );
}
