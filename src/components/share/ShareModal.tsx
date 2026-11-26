"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Share2,
  Copy,
  Check,
  Clock,
  X,
  Trash2,
  Eye,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { ResumeDoc } from "@/types/resume";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";

interface ShareModalProps {
  resumeVersionId: string;
  isOpen: boolean;
  onClose: () => void;
  previewDoc?: ResumeDoc;
}

interface ShareRecord {
  id: string;
  resumeVersionId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  viewCount?: number;
  lastViewedAt?: string | null;
  daysRemaining?: number;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
}

export function ShareModal({ resumeVersionId, isOpen, onClose, previewDoc }: ShareModalProps) {
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [redactContact, setRedactContact] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeShares, setActiveShares] = useState<ShareRecord[]>([]);
  const [showSnapshotPreview, setShowSnapshotPreview] = useState(false);

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/shares");
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || [];
        const relevant = list.filter(
          (s: ShareRecord) => s.resumeVersionId === resumeVersionId && !s.revokedAt
        );
        setActiveShares(relevant);
      }
    } catch (err) {
      console.error("Failed to load active shares:", err);
    }
  }, [resumeVersionId]);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      setGeneratedUrl(null);
      setCopied(false);
      setShowSnapshotPreview(false);
    }
  }, [isOpen, fetchShares]);

  const redactedPreviewDoc = useMemo(() => {
    if (!previewDoc) return null;
    const copy: ResumeDoc = JSON.parse(JSON.stringify(previewDoc));
    if (redactContact && copy.profile) {
      copy.profile = {
        ...copy.profile,
        email: "[Contact via Shared Profile]",
        phone: "[Hidden for Privacy]",
        location: copy.profile.location ? copy.profile.location.split(",")[0] : undefined,
      };
    }
    return copy;
  }, [previewDoc, redactContact]);

  if (!isOpen) return null;

  const expiringSoonCount = activeShares.filter((s) => s.isExpiringSoon).length;
  const totalViews = activeShares.reduce((acc, s) => acc + (s.viewCount || 0), 0);

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
        const payload = json?.data ?? json;
        const fullUrl = `${window.location.origin}${payload.shareUrl}`;
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
      <div className="bg-white rounded-lg shadow-plate border border-rule-strong max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-rule-strong">
          <div className="flex items-center gap-2 text-ink font-bold text-base">
            <Share2 className="w-5 h-5 text-stamp" />
            Share Resume Snapshot &amp; Link Analytics
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-graphite hover:text-ink rounded-lg hover:bg-paper transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs text-graphite leading-relaxed">
            Generate an expiring, read-only snapshot link for recruiters. View counts and link expiry alerts are visible only to you here—never to visitors opening the link.
          </p>

          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2 rounded border border-marker/45 bg-marker-soft px-3 py-2 text-xs text-marker-dark">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {expiringSoonCount} active link{expiringSoonCount > 1 ? "s" : ""} will expire within 5 days. Create a fresh link if a hiring team still needs access.
              </span>
            </div>
          )}

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

            {redactedPreviewDoc && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSnapshotPreview((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-stamp hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showSnapshotPreview ? "Hide /s/[token] recipient preview" : "Preview how /s/[token] looks to recruiters"}
                </button>
              </div>
            )}
          </div>

          {showSnapshotPreview && redactedPreviewDoc && (
            <div className="rounded border border-rule bg-paper-alt p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-graphite">
                <span>Public Snapshot Preview ({redactContact ? "Contact Redacted" : "Full Contact Visible"})</span>
                <span>Allow PDF: {allowDownload ? "Yes" : "No"}</span>
              </div>
              <div className="max-h-72 overflow-y-auto border border-rule bg-white p-2">
                <TemplateRenderer
                  doc={redactedPreviewDoc}
                  templateId={redactedPreviewDoc.template?.id || "classic-ats"}
                  readOnly
                />
              </div>
            </div>
          )}

          {generatedUrl ? (
            <div className="p-3 bg-stamp-soft rounded-lg border border-stamp space-y-2">
              <span className="block text-[11px] font-semibold text-ink">Active Share Link</span>
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
                <a
                  href={`${generatedUrl}?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-2 border border-stamp bg-white text-stamp rounded-lg text-xs font-medium hover:bg-paper shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
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
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-semibold text-ink">
                  Previously Active Links ({activeShares.length})
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-graphite">
                  <Eye className="h-3 w-3" /> {totalViews} total views
                </span>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {activeShares.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-paper rounded-lg border border-rule-strong text-xs"
                  >
                    <div className="space-y-0.5 text-[11px] text-graphite">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-ink font-medium">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(s.expiresAt).toLocaleDateString()}
                        </span>
                        {s.isExpiringSoon && (
                          <span className="rounded bg-marker-soft px-1.5 py-0.5 font-mono text-[10px] text-marker-dark">
                            {s.daysRemaining}d left
                          </span>
                        )}
                        {s.isExpired && (
                          <span className="rounded bg-alarm-soft px-1.5 py-0.5 font-mono text-[10px] text-alarm">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px]">
                        <span>{s.viewCount ?? 0} views</span>
                        {s.lastViewedAt && (
                          <span>last viewed {new Date(s.lastViewedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-alarm hover:bg-alarm-soft"
                      title="Revoke link immediately"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
