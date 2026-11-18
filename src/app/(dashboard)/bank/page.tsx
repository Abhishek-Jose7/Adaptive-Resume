"use client";

import React, { useState, useEffect } from "react";
import { BankEntry, CompletenessReport, EntryType } from "@/types/bank";
import { BankEntryCard } from "@/components/bank/BankEntryCard";
import { BankEntryModal } from "@/components/bank/BankEntryModal";
import { CompletenessWarning } from "@/components/bank/CompletenessWarning";
import { DuplicateDetectorModal } from "@/components/bank/DuplicateDetectorModal";
import {
  Plus,
  Search,
  Filter,
  Copy,
  RefreshCw,
  Sparkles,
  UploadCloud,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function DataBankPage() {
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
      setNotification("Entry deleted successfully. (Undo available via API)");
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
    // Find expected row version
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Career Data Bank</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Single source of truth. Your tailored resumes are created strictly from these verified facts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDetectDuplicates}
            className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
            Check Duplicates
          </button>
          <Link
            href="/bank/intake"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import / Ingest
          </Link>
          <button
            onClick={() => {
              setEntryToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

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
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedType === c.id
                  ? "bg-gray-900 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-100"
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
            className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
        </form>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading your Data Bank records...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-xl p-8 space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Your Data Bank is empty</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Add your career history, projects, and skills manually or import existing resumes (PDF/DOCX) or LinkedIn exports.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setEntryToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              Add First Entry
            </button>
            <Link
              href="/bank/intake"
              className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
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
            />
          ))}
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
    </div>
  );
}
