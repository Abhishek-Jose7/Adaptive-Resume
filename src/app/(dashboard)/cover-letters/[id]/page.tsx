"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Save, Copy, Check, Printer } from "lucide-react";
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
    return <p className="py-20 text-center text-[13px] text-graphite">Reading the letter</p>;
  }

  if (!letter) {
    return (
      <div className="py-20 text-center">
        <p className="text-[13px] text-alarm">This letter is gone.</p>
        <Link href="/cover-letters" className="mt-2 inline-block text-[13px] text-stamp hover:underline">
          Back to cover letters
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 border-b border-rule pb-4">
        <Link
          href="/cover-letters"
          className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-graphite hover:text-ink print:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Cover letters
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-transparent bg-transparent font-display text-[24px] font-semibold tracking-tightest hover:border-rule focus:border-stamp focus:outline-none"
            />
            {letter.jobCompany && (
              <p className="mt-1 text-[12.5px] text-graphite">
                {letter.jobTitle || "Role"} at {letter.jobCompany} · tone {letter.tone}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <button onClick={handleCopy} className="btn btn-sm">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-press" strokeWidth={2} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => window.print()} className="btn btn-sm">
              <Printer className="h-3.5 w-3.5" strokeWidth={1.7} />
              Print
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-sm btn-primary">
              <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      </header>

      <div className="plate">
        <div className="plate-caption print:hidden">
          <span>letter sheet</span>
          <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <textarea
          rows={22}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full resize-none border-0 bg-sheet px-6 py-6 text-[14px] leading-[1.75] text-ink focus:outline-none print:px-0"
          placeholder="Letter text"
        />
      </div>
    </div>
  );
}
