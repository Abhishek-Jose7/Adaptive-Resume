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
import {
  fetchBankEntriesCached,
  getCachedVaultSnapshot,
  invalidateVaultCache,
  setCachedVaultSnapshot,
} from "@/lib/cache/vaultClientCache";

function sortEntriesForVault(a: BankEntry, b: BankEntry): number {
  if (a.entryType === "project" && b.entryType === "project") {
    const orderDiff = (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (createdA !== createdB) return createdA - createdB;
    return String(a.id).localeCompare(String(b.id));
  }
  return compareReverseChronological(a, b);
}

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Quantification Assistant modal state
  const [isQuantifyOpen, setIsQuantifyOpen] = useState(false);
  const [quantifyTarget, setQuantifyTarget] = useState<{
    entry: BankEntry;
    bullet: AchievementBullet;
  } | null>(null);

  const fetchEntries = useCallback(async (forceRefresh = false) => {
    const isUnfiltered = selectedType === "all" && !searchQuery.trim();
    if (isUnfiltered && !forceRefresh) {
      const cached = getCachedVaultSnapshot();
      if (cached?.items) {
        const sortedCached = [...cached.items].sort(sortEntriesForVault);
        setEntries(sortedCached);
        setVaultEntries(sortedCached);
        if (cached.completeness) setCompleteness(cached.completeness);
        setLoading(false);
      }
    } else {
      setLoading(true);
    }

    setLoadError(null);
    try {
      let rawItems: BankEntry[] = [];
      let comp: CompletenessReport | undefined;

      if (isUnfiltered) {
        const snapshot = await fetchBankEntriesCached({ forceRefresh });
        rawItems = snapshot.items || [];
        comp = snapshot.completeness;
      } else {
        const params = new URLSearchParams();
        if (selectedType !== "all") params.set("entryType", selectedType);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());

        const res = await fetch(`/api/v1/bank/entries?${params.toString()}`);
        if (!res.ok) throw new Error("Could not load Career Vault entries. Please retry.");
        const data = await res.json();
        rawItems = data.items || [];
        comp = data.completeness;
      }

      const items = [...rawItems].sort(sortEntriesForVault);
      setEntries(items);
      if (isUnfiltered) {
        setVaultEntries(items);
      } else {
        fetchBankEntriesCached()
          .then((snap) => {
            if (snap?.items) setVaultEntries(snap.items);
          })
          .catch(() => { });
      }
      setCompleteness(comp);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || "Could not load your Career Vault right now.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries(true);
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
    invalidateVaultCache();
    await fetchEntries(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    const res = await fetch(`/api/v1/bank/entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      invalidateVaultCache();
      setNotification("Entry deleted. Every resume built from it will ask again.");
      setTimeout(() => setNotification(null), 4000);
      await fetchEntries(true);
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
      invalidateVaultCache();
      await fetchEntries(true);
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
      invalidateVaultCache();
      await fetchEntries(true);
    }
  };

  const handleDeleteBullet = async (bulletId: string) => {
    const res = await fetch(`/api/v1/bank/bullets/${bulletId}`, { method: "DELETE" });
    if (res.ok) {
      invalidateVaultCache();
      await fetchEntries(true);
    }
  };

  const handleReorderBullets = async (entryId: string, bulletIds: string[]) => {
    const reorderBulletsList = (list: BankEntry[]) =>
      list.map((entry) => {
        if (entry.id !== entryId) return entry;
        const byId = new Map((entry.bullets || []).map((b) => [b.id, b]));
        const reordered = bulletIds
          .map((id, idx) => {
            const found = byId.get(id);
            return found ? { ...found, sortOrder: idx } : null;
          })
          .filter((b): b is AchievementBullet => Boolean(b));
        return { ...entry, bullets: reordered };
      });

    // Apply optimistic reorder instantly in UI & cache
    setEntries((prev) => reorderBulletsList(prev));
    setVaultEntries((prev) => {
      const updated = reorderBulletsList(prev);
      setCachedVaultSnapshot({ items: updated, completeness, fetchedAt: Date.now() });
      return updated;
    });

    const res = await fetch(`/api/v1/bank/entries/${entryId}/bullets/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulletIds }),
    });
    if (!res.ok) {
      invalidateVaultCache();
      await fetchEntries(true);
    }
  };

  const applyProjectOrder = async (nextProjects: BankEntry[]) => {
    const orderMap: Record<string, number> = {};
    nextProjects.forEach((p, orderIdx) => {
      orderMap[p.id] = orderIdx;
    });

    const applySortOrders = (list: BankEntry[]) =>
      list
        .map((item) =>
          item.entryType === "project" && Object.prototype.hasOwnProperty.call(orderMap, item.id)
            ? { ...item, sortOrder: orderMap[item.id] }
            : item
        )
        .sort(sortEntriesForVault);

    setEntries((prev) => applySortOrders(prev));
    setVaultEntries((prev) => {
      const updated = applySortOrders(prev);
      setCachedVaultSnapshot({ items: updated, completeness, fetchedAt: Date.now() });
      return updated;
    });

    const res = await fetch("/api/v1/bank/entries/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        entryIds: Object.keys(orderMap),
        orderMap,
      }),
    });
    if (!res.ok) {
      invalidateVaultCache();
      await fetchEntries(true);
    }
  };

  const handleMoveProjectConfidence = async (entryId: string, direction: "up" | "down") => {
    const sourceList = vaultEntries.length > 0 ? vaultEntries : entries;
    const projectsOrdered = sourceList
      .filter((e) => e.entryType === "project")
      .sort(sortEntriesForVault);
    const idx = projectsOrdered.findIndex((p) => p.id === entryId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= projectsOrdered.length) return;

    const nextProjects = [...projectsOrdered];
    const [moved] = nextProjects.splice(idx, 1);
    nextProjects.splice(targetIdx, 0, moved);
    await applyProjectOrder(nextProjects);
  };

  const handleSetProjectConfidenceRank = async (entryId: string, targetRankIndex: number) => {
    const sourceList = vaultEntries.length > 0 ? vaultEntries : entries;
    const projectsOrdered = sourceList
      .filter((e) => e.entryType === "project")
      .sort(sortEntriesForVault);
    const idx = projectsOrdered.findIndex((p) => p.id === entryId);
    if (idx === -1 || targetRankIndex < 0 || targetRankIndex >= projectsOrdered.length) return;
    if (idx === targetRankIndex) return;

    const nextProjects = [...projectsOrdered];
    const [moved] = nextProjects.splice(idx, 1);
    nextProjects.splice(targetRankIndex, 0, moved);
    await applyProjectOrder(nextProjects);
  };

  const allOrderedProjects = (vaultEntries.length > 0 ? vaultEntries : entries)
    .filter((e) => e.entryType === "project")
    .sort(sortEntriesForVault);
  const projectConfidenceRankById = new Map<string, number>();
  allOrderedProjects.forEach((p, idx) => {
    projectConfidenceRankById.set(p.id, idx + 1);
  });

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

  const categoryAddMeta: Record<string, { entryType: EntryType; buttonLabel: string; emptyHeading: string; emptyBody: string }> = {
    all: {
      entryType: "experience",
      buttonLabel: "New entry",
      emptyHeading: "Your experience will show up here",
      emptyBody: "Add a past role or import a resume you already trust. You can update these details whenever you like.",
    },
    experience: {
      entryType: "experience",
      buttonLabel: "Add experience",
      emptyHeading: "No work experience saved yet",
      emptyBody: "Add a role, internship, or leadership position with its dates and measurable outcomes.",
    },
    education: {
      entryType: "education",
      buttonLabel: "Add education",
      emptyHeading: "No education saved yet",
      emptyBody: "Add your degree, institution, graduation timeline, and honors or coursework.",
    },
    project: {
      entryType: "project",
      buttonLabel: "Add project",
      emptyHeading: "No projects saved yet",
      emptyBody: "Add a project with its tech stack and measurable impact.",
    },
    skill_group: {
      entryType: "skill_group",
      buttonLabel: "Add skill group",
      emptyHeading: "No skill groups saved yet",
      emptyBody: "Group skills by domain (e.g., Languages, AI & GenAI, Backend) so tailored resumes stay scannable.",
    },
    certification: {
      entryType: "certification",
      buttonLabel: "Add certification",
      emptyHeading: "No certifications saved yet",
      emptyBody: "Add credentials or courses along with issuing organization and completion date.",
    },
    award: {
      entryType: "award",
      buttonLabel: "Add award",
      emptyHeading: "No awards or hackathon wins yet",
      emptyBody: "Add hackathon wins, scholarships, or honors to highlight under Achievements.",
    },
    volunteer: {
      entryType: "volunteer",
      buttonLabel: "Add volunteer role",
      emptyHeading: "No volunteer roles saved yet",
      emptyBody: "Add community work, mentoring, or open-source involvement.",
    },
    custom: {
      entryType: "custom",
      buttonLabel: "Add custom entry",
      emptyHeading: "No custom entries yet",
      emptyBody: "Add additional sections like publications, patents, or fellowships.",
    },
  };
  const activeAddMeta = categoryAddMeta[selectedType] || categoryAddMeta.all;

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
            {activeAddMeta.buttonLabel}
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

              <div className="flex flex-wrap items-center gap-2">
                {selectedType !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEntryToEdit(null);
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    {activeAddMeta.buttonLabel}
                  </button>
                )}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:w-64 lg:flex-none">
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
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-graphite">
                <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
                Reading your records
              </div>
            ) : loadError && entries.length === 0 ? (
              <div className="panel border-red-700/25 bg-red-50/40 px-6 py-12 text-center">
                <h3 className="font-display text-[18px] font-semibold text-ink">
                  Unable to sync Career Vault right now
                </h3>
                <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-graphite">
                  Your saved records are safe. {loadError}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => {
                      setLoading(true);
                      void fetchEntries(true);
                    }}
                    className="btn btn-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Retry loading Vault
                  </button>
                </div>
              </div>
            ) : entries.length === 0 ? (
              <div className="panel px-6 py-14 text-center">
                <h3 className="font-display text-[18px] font-semibold">{activeAddMeta.emptyHeading}</h3>
                <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-graphite">
                  {activeAddMeta.emptyBody}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => {
                      setEntryToEdit(null);
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    {activeAddMeta.buttonLabel}
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
                    confidenceRank={projectConfidenceRankById.get(entry.id)}
                    totalProjectsCount={allOrderedProjects.length}
                    onMoveProjectUp={(id) => handleMoveProjectConfidence(id, "up")}
                    onMoveProjectDown={(id) => handleMoveProjectConfidence(id, "down")}
                    onSetProjectConfidenceRank={handleSetProjectConfidenceRank}
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
        defaultEntryType={activeAddMeta.entryType}
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
          onBulletUpdated={() => {
            invalidateVaultCache();
            void fetchEntries(true);
          }}
        />
      )}
    </div>
  );
}
