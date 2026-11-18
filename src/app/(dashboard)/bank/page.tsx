"use client";

import React, { useState, useEffect } from "react";
import { BankEntry, CompletenessReport, EntryType, AchievementBullet } from "@/types/bank";
import { BankEntryCard } from "@/components/bank/BankEntryCard";
import { BankEntryModal } from "@/components/bank/BankEntryModal";
import { CompletenessWarning } from "@/components/bank/CompletenessWarning";
import { DuplicateDetectorModal } from "@/components/bank/DuplicateDetectorModal";
import { CareerGraphView } from "@/components/career/CareerGraphView";
import { QuantificationAssistantModal } from "@/components/quantification/QuantificationAssistantModal";
import {
  Plus,
  Search,
  Filter,
  Copy,
  RefreshCw,
  Sparkles,
  UploadCloud,
  CheckCircle,
  Network,
  ListFilter,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function DataBankPage() {
  const [viewMode, setViewMode] = useState<"facts" | "graph">("facts");
  const [entries, setEntries] = useState<BankEntry[]>([]);
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

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("entryType", selectedType);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/v1/bank/entries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load entries");
      const data = await res.json();
      setEntries(data.items || []);
      setCompleteness(data.completeness);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedType]);

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
      setNotification("Entry deleted successfully.");
      setTimeout(() => setNotification(null), 4000);
      await fetchEntries();
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
    { id: "all", label: "All Items" },
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
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Career Data Bank
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
              Truth Anchor
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Single source of truth. Your tailored resumes and cover letters are created strictly from these verified facts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode("facts")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "facts"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Facts List
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "graph"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Career Graph (18.3)
            </button>
          </div>

          <button
            onClick={handleDetectDuplicates}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-800 rounded-lg text-xs font-medium text-gray-300 bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-gray-400" />
            Check Duplicates
          </button>
          <Link
            href="/bank/intake"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import / Ingest
          </Link>
          <button
            onClick={() => {
              setEntryToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Render View Mode */}
      {viewMode === "graph" ? (
        <CareerGraphView />
      ) : (
        <div className="space-y-6">
          {/* Completeness Health Warning */}
          <CompletenessWarning report={completeness} />

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedType(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedType === c.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bank facts..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-800 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
            </form>
          </div>

          {/* Entries List */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" />
              Loading your verified Data Bank records...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-8 space-y-3">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Your Data Bank is empty</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Add your career history, projects, and skills manually or import existing resumes (PDF/DOCX) or LinkedIn exports.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setEntryToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
                >
                  Add First Entry
                </button>
                <Link
                  href="/bank/intake"
                  className="px-4 py-2 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Import Resume / LinkedIn
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <BankEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => {
                    setEntryToEdit(e);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteEntry}
                  onAddBullet={handleAddBullet}
                  onUpdateBullet={handleUpdateBullet}
                  onDeleteBullet={handleDeleteBullet}
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

      {/* Entry Modal */}
      <BankEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entryToEdit={entryToEdit}
        onSave={handleSaveEntry}
      />

      {/* Duplicate Detection Modal */}
      <DuplicateDetectorModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        duplicates={duplicateReport}
      />

      {/* Quantification Assistant Modal (Section 18.4) */}
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
