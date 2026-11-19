"use client";

import React, { useState, useEffect } from "react";
import { Share2, Copy, Check, Shield, Clock, X, Trash2 } from "lucide-react";

interface ShareModalProps {
  resumeVersionId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareRecord {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export function ShareModal({ resumeVersionId, isOpen, onClose }: ShareModalProps) {
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [redactContact, setRedactContact] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeShares, setActiveShares] = useState<ShareRecord[]>([]);

  const fetchShares = async () => {
    try {
      const res = await fetch("/api/v1/shares");
      if (res.ok) {
        const json = await res.json();
        const relevant = (json.data || []).filter(
          (s: any) => s.resumeVersionId === resumeVersionId && !s.revokedAt
        );
        setActiveShares(relevant);
      }
    } catch (err) {
      console.error("Failed to load active shares:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      setGeneratedUrl(null);
      setCopied(false);
    }
  }, [isOpen, resumeVersionId]);

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeVersionId,
          expiresInDays,
          redactContact,
          allowDownload,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const fullUrl = `${window.location.origin}${json.data.shareUrl}`;
        setGeneratedUrl(fullUrl);
        await fetchShares();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create share link");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/shares/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchShares();
      }
    } catch (err) {
      console.error("Failed to revoke share link:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-plate border border-rule-strong max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-rule-strong">
          <div className="flex items-center gap-2 text-ink font-bold text-base">
            <Share2 className="w-5 h-5 text-stamp" />
            Share Resume Snapshot
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-graphite hover:text-graphite rounded-lg hover:bg-paper transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs text-graphite leading-relaxed">
            Generate an expiring, read-only link to share this resume snapshot with recruiters and hiring managers.
          </p>

          <div className="space-y-3 bg-paper p-4 rounded-lg border border-rule-strong text-xs">
            <div>
              <label className="font-semibold text-ink block mb-1">Link Expiration</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full bg-white border border-rule-strong rounded-lg p-2 text-xs focus:ring-2 focus:ring-stamp focus:outline-none"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days (Recommended)</option>
                <option value={90}>90 Days</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={redactContact}
                onChange={(e) => setRedactContact(e.target.checked)}
                className="w-4 h-4 rounded text-stamp focus:ring-stamp"
              />
              <span className="text-ink font-medium">Redact private contact information (phone, email)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="w-4 h-4 rounded text-stamp focus:ring-stamp"
              />
              <span className="text-ink font-medium">Allow viewer to download / print PDF</span>
            </label>
          </div>

          {generatedUrl ? (
            <div className="p-3 bg-stamp rounded-lg border border-stamp">
              <span className="block text-[11px] font-semibold text-stamp mb-1">Active Share Link</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="w-full bg-white border border-stamp rounded-lg p-2 text-xs text-ink font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-stamp text-white rounded-lg text-xs font-medium hover:bg-stamp-dark shrink-0 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateShare}
              disabled={loading}
              className="w-full py-2.5 bg-stamp hover:bg-stamp-dark text-white rounded-lg text-xs font-semibold shadow-none transition-colors disabled:opacity-50"
            >
              {loading ? "Generating Link..." : "Create Expiring Share Link"}
            </button>
          )}

          {activeShares.length > 0 && (
            <div className="pt-3 border-t border-rule-strong">
              <span className="block text-xs font-semibold text-ink mb-2">Previously Active Links</span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {activeShares.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 bg-paper rounded-lg border border-rule-strong text-xs"
                  >
                    <div className="flex items-center gap-2 text-graphite text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-graphite" />
                      <span>Expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="text-alarm hover:text-alarm text-[11px] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
