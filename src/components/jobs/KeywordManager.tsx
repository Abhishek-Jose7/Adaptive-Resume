"use client";

import React, { useState } from "react";
import { JDKeyword } from "@/types/job";
import {
  Tag,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface KeywordManagerProps {
  jobId: string;
  initialKeywords: JDKeyword[];
  onKeywordsUpdated: (updated: JDKeyword[]) => Promise<void>;
}

export function KeywordManager({
  jobId,
  initialKeywords,
  onKeywordsUpdated,
}: KeywordManagerProps) {
  const [keywords, setKeywords] = useState<JDKeyword[]>(initialKeywords);
  const [newKeywordName, setNewKeywordName] = useState("");
  const [newKeywordCategory, setNewKeywordCategory] = useState<JDKeyword["category"]>("technical_skill");
  const [newKeywordPriority, setNewKeywordPriority] = useState<JDKeyword["priority"]>("must_have");
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activeKeywords = keywords.filter((k) => k.userOverride !== "removed");
  const mustHaves = activeKeywords.filter((k) => k.priority === "must_have");
  const niceToHaves = activeKeywords.filter((k) => k.priority === "nice_to_have");

  const saveOverrides = async (updated: JDKeyword[]) => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      await onKeywordsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (id: string) => {
    const updated = keywords.map((k) =>
      k.id === id ? { ...k, priority: "must_have" as const, userOverride: "promoted" as const } : k
    );
    setKeywords(updated);
    saveOverrides(updated);
  };

  const handleDemote = (id: string) => {
    const updated = keywords.map((k) =>
      k.id === id ? { ...k, priority: "nice_to_have" as const, userOverride: "demoted" as const } : k
    );
    setKeywords(updated);
    saveOverrides(updated);
  };

  const handleRemove = (id: string) => {
    const updated = keywords.map((k) =>
      k.id === id ? { ...k, userOverride: "removed" as const } : k
    );
    setKeywords(updated);
    saveOverrides(updated);
  };

  const handleAddCustomKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordName.trim()) return;

    const newKw: JDKeyword = {
      id: `kw_custom_${Date.now()}`,
      canonical: newKeywordName.trim(),
      synonyms: [],
      category: newKeywordCategory,
      priority: newKeywordPriority,
      importance: newKeywordPriority === "must_have" ? 0.9 : 0.6,
      evidencePhrase: "User added",
      userOverride: "promoted",
    };

    const updated = [...keywords, newKw];
    setKeywords(updated);
    setNewKeywordName("");
    saveOverrides(updated);
  };

  return (
    <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            Extracted Job Requirements &amp; Keyword Weights (PRD Section 6.5 N3)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Keyword priorities drive both AI tailoring bullet selection and the Resume–JD Match Score. Promote or demote as needed.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Add Custom Keyword Bar */}
      <form onSubmit={handleAddCustomKeyword} className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-lg border">
        <input
          type="text"
          value={newKeywordName}
          onChange={(e) => setNewKeywordName(e.target.value)}
          placeholder="Add missing skill or keyword (e.g. Next.js)..."
          className="flex-1 min-w-[180px] border rounded-md px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={newKeywordCategory}
          onChange={(e) => setNewKeywordCategory(e.target.value as any)}
          className="border rounded-md px-2 py-1.5 text-xs bg-white"
        >
          <option value="technical_skill">Technical Skill</option>
          <option value="tool">Tool</option>
          <option value="domain">Domain</option>
          <option value="soft_skill">Soft Skill</option>
        </select>
        <select
          value={newKeywordPriority}
          onChange={(e) => setNewKeywordPriority(e.target.value as any)}
          className="border rounded-md px-2 py-1.5 text-xs bg-white"
        >
          <option value="must_have">Must-Have</option>
          <option value="nice_to_have">Nice-to-Have</option>
        </select>
        <button
          type="submit"
          disabled={!newKeywordName.trim() || loading}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </form>

      {/* Must-Have Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Must-Have Keywords ({mustHaves.length})
          </span>
          <span className="text-[11px] text-gray-400">High weight in Match Score</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {mustHaves.map((kw) => (
            <div
              key={kw.id}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-red-50/70 border-red-200 text-red-900"
            >
              <span>{kw.canonical}</span>
              {kw.synonyms.length > 0 && (
                <span className="text-[10px] text-red-600 font-normal">
                  ({kw.synonyms.join(", ")})
                </span>
              )}
              <div className="flex items-center gap-0.5 ml-1 opacity-60 group-hover:opacity-100">
                <button
                  onClick={() => handleDemote(kw.id)}
                  title="Demote to Nice-to-Have"
                  className="p-0.5 hover:bg-red-200 rounded text-red-700"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleRemove(kw.id)}
                  title="Remove keyword"
                  className="p-0.5 hover:bg-red-200 rounded text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {mustHaves.length === 0 && (
            <span className="text-xs text-gray-400 italic">No must-have keywords yet.</span>
          )}
        </div>
      </div>

      {/* Nice-to-Have Section */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Nice-to-Have Keywords ({niceToHaves.length})
          </span>
          <span className="text-[11px] text-gray-400">Secondary score contribution</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {niceToHaves.map((kw) => (
            <div
              key={kw.id}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50/70 border-blue-200 text-blue-900"
            >
              <span>{kw.canonical}</span>
              {kw.synonyms.length > 0 && (
                <span className="text-[10px] text-blue-600 font-normal">
                  ({kw.synonyms.join(", ")})
                </span>
              )}
              <div className="flex items-center gap-0.5 ml-1 opacity-60 group-hover:opacity-100">
                <button
                  onClick={() => handlePromote(kw.id)}
                  title="Promote to Must-Have"
                  className="p-0.5 hover:bg-blue-200 rounded text-blue-700"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleRemove(kw.id)}
                  title="Remove keyword"
                  className="p-0.5 hover:bg-blue-200 rounded text-blue-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {niceToHaves.length === 0 && (
            <span className="text-xs text-gray-400 italic">No nice-to-have keywords yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
