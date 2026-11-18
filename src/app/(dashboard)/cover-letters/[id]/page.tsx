"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Copy, Check, Printer, Trash2, Mail, Building2 } from "lucide-react";
import Link from "next/link";

interface CoverLetterData {
  id: string;
  title: string;
  content: string;
  tone: string;
  jobTitle?: string | null;
  jobCompany?: string | null;
}

export default function CoverLetterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const letterId = params?.id as string;

  const [letter, setLetter] = useState<CoverLetterData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLetter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/cover-letters/${letterId}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      const data = json.data || json;
      setLetter(data);
      setTitle(data.title);
      setContent(data.content);
      setTone(data.tone);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (letterId) fetchLetter();
  }, [letterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/cover-letters/${letterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tone }),
      });
      if (res.ok) {
        const json = await res.json();
        setLetter(json.data || json);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading cover letter...</div>;
  }

  if (!letter) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        Cover letter not found.{" "}
        <Link href="/cover-letters" className="underline">
          Return to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cover-letters"
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-600 focus:outline-none"
            />
            {letter.jobCompany && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-gray-400" />
                Target: {letter.jobTitle || "Role"} at {letter.jobCompany}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Text"}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-xs print:hidden"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Editor Sheet */}
      <div className="bg-white border rounded-xl shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-4">
        <textarea
          rows={22}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full text-sm text-gray-800 leading-relaxed font-sans border-0 focus:ring-0 resize-none p-0 focus:outline-none"
          placeholder="Cover letter text..."
        />
      </div>
    </div>
  );
}
