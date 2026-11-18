"use client";

import React, { useState } from "react";
import { FileEdit, Sparkles, AlertTriangle } from "lucide-react";
import { MAX_PASTED_TEXT_LENGTH } from "@/lib/parsers/fileValidator";

interface PasteTextInputProps {
  onParsedItemsReady: (sourceType: string, sourceLabel: string, items: any[]) => Promise<void>;
}

export function PasteTextInput({ onParsedItemsReady }: PasteTextInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (text.length > MAX_PASTED_TEXT_LENGTH) {
      setError(`Text exceeds maximum allowed length of ${MAX_PASTED_TEXT_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse pasted text into structured candidates by detecting paragraphs and bullet lines
      const paragraphs = text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const items = paragraphs.map((p, idx) => {
        const lines = p
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        const title = lines[0] || `Career Entry #${idx + 1}`;
        const bullets = lines.slice(1).map((l) => l.replace(/^[•\-\*]\s*/, ""));

        return {
          entryType: "experience",
          rawSnippet: p.substring(0, 150) + (p.length > 150 ? "..." : ""),
          parsedDataJson: {
            title,
            organization: "Pasted Career History",
            descriptionContext: p,
            bullets: bullets.length > 0 ? bullets : [title],
          },
          confidence: 0.85,
        };
      });

      await onParsedItemsReady("free_text", "Pasted Career Text", items);
      setText("");
    } catch (err: any) {
      setError(err.message || "Failed to parse text.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-6 bg-white shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <FileEdit className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Paste Free-Form Career Text or LinkedIn Profile
        </h3>
      </div>
      <p className="text-xs text-gray-500">
        Paste paragraphs, bio, or job bullet lists. Content is structured into candidate entries and atomic bullets and placed in the staging area for your review. (Max {MAX_PASTED_TEXT_LENGTH} chars).
      </p>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your resume content, LinkedIn 'About' text, or role descriptions here..."
        rows={6}
        className="w-full border rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
      />

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {text.length.toLocaleString()} / {MAX_PASTED_TEXT_LENGTH.toLocaleString()} characters
        </span>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? "Structuring..." : "Structure and Stage"}
        </button>
      </div>
    </form>
  );
}
