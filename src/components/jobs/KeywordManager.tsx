"use client";

import React, { useState } from "react";
import { JDKeyword } from "@/types/job";
import { ArrowUp, ArrowDown, Trash2, Plus, Check } from "lucide-react";

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

  const renderTag = (kw: JDKeyword, mode: "must" | "nice") => (
    <li
      key={kw.id}
      className="group inline-flex items-center gap-1.5 border border-rule bg-sheet px-2 py-1 text-[12px]"
    >
      <span className="font-medium">{kw.canonical}</span>
      {kw.synonyms.length > 0 && (
        <span className="font-mono text-[10px] text-graphite">({kw.synonyms.join(", ")})</span>
      )}
      <span className="flex items-center gap-0.5 opacity-50 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {mode === "must" ? (
          <button
            onClick={() => handleDemote(kw.id)}
            title="Move to nice-to-have"
            aria-label="Move to nice-to-have"
            className="p-0.5 text-graphite hover:text-ink"
          >
            <ArrowDown className="h-3 w-3" strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => handlePromote(kw.id)}
            title="Move to must-have"
            aria-label="Move to must-have"
            className="p-0.5 text-graphite hover:text-ink"
          >
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
        <button
          onClick={() => handleRemove(kw.id)}
          title="Remove keyword"
          aria-label="Remove keyword"
          className="p-0.5 text-graphite hover:text-alarm"
        >
          <Trash2 className="h-3 w-3" strokeWidth={2} />
        </button>
      </span>
    </li>
  );

  return (
    <section className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <h3 className="font-display text-[16px] font-semibold tracking-tight">
            Requirements and weights
          </h3>
          <p className="mt-0.5 text-[12px] text-graphite">
            Priority drives both the bullets chosen and the score.
          </p>
        </div>
        {savedSuccess && (
          <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-press">
            <Check className="h-3 w-3" strokeWidth={2.2} />
            saved
          </span>
        )}
      </div>

      <form
        onSubmit={handleAddCustomKeyword}
        className="flex flex-wrap items-center gap-2 border-b border-rule bg-paper-alt px-4 py-2.5 sm:px-5"
      >
        <input
          type="text"
          value={newKeywordName}
          onChange={(e) => setNewKeywordName(e.target.value)}
          placeholder="Add a skill the posting asks for"
          className="input min-w-[160px] flex-1"
        />
        <select
          value={newKeywordCategory}
          onChange={(e) => setNewKeywordCategory(e.target.value as any)}
          className="select w-auto"
        >
          <option value="technical_skill">Technical skill</option>
          <option value="tool">Tool</option>
          <option value="domain">Domain</option>
          <option value="soft_skill">Soft skill</option>
        </select>
        <select
          value={newKeywordPriority}
          onChange={(e) => setNewKeywordPriority(e.target.value as any)}
          className="select w-auto"
        >
          <option value="must_have">Must-have</option>
          <option value="nice_to_have">Nice-to-have</option>
        </select>
        <button
          type="submit"
          disabled={!newKeywordName.trim() || loading}
          className="btn btn-sm btn-primary"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add
        </button>
      </form>

      <div className="grid grid-cols-1 divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3.5 sm:px-5">
          <div className="flex items-baseline justify-between border-t border-ink pt-1.5">
            <span className="text-[12.5px] font-semibold">Must-have</span>
            <span className="folio">{mustHaves.length}</span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {mustHaves.length === 0 ? (
              <li className="text-[12px] text-graphite">None read yet</li>
            ) : (
              mustHaves.map((kw) => renderTag(kw, "must"))
            )}
          </ul>
        </div>

        <div className="px-4 py-3.5 sm:px-5">
          <div className="flex items-baseline justify-between border-t border-rule-strong pt-1.5">
            <span className="text-[12.5px] font-semibold text-graphite">Nice-to-have</span>
            <span className="folio">{niceToHaves.length}</span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {niceToHaves.length === 0 ? (
              <li className="text-[12px] text-graphite">None read yet</li>
            ) : (
              niceToHaves.map((kw) => renderTag(kw, "nice"))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
