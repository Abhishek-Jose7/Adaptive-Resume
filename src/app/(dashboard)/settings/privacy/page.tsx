"use client";

import React, { useState } from "react";
import { Download, Trash2, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

export default function PrivacySettingsPage() {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  const handleDownloadExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/v1/export/account.json");
      if (!res.ok) throw new Error("Failed to generate data archive");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_maker_archive_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to download export");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE MY DATA") return;
    setDeleting(true);

    try {
      const res = await fetch("/api/v1/account", { method: "DELETE" });
      if (res.ok) {
        setDeleteStatus("Account purged. Closing the tab shortly.");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to delete account");
        setDeleting(false);
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while deleting your account");
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="mb-6 border-b border-rule pb-5">
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
          Privacy and data
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
          Your career record belongs to you. Take all of it as JSON, or remove the whole account and
          everything attached to it.
        </p>
      </header>

      {deleteStatus && (
        <div className="mb-5 flex items-start gap-2 border border-press/30 bg-press-soft px-3 py-2 text-[12.5px] text-press">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>{deleteStatus}</span>
        </div>
      )}

      <div className="space-y-4">
        <section className="panel px-5 py-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-press" strokeWidth={1.6} />
            <div>
              <h3 className="font-display text-[16px] font-semibold tracking-tight">
                No training, no resale
              </h3>
              <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-graphite">
                Employer names, compensation and achievement metrics stay private. Nothing is used to train
                a model, and keys you add are encrypted at rest before they are stored.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Export everything</h3>
            <span className="folio">json</span>
          </div>
          <div className="px-5 py-4">
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-graphite">
              One archive: your saved experience, each resume version, the job descriptions,
              application stages and letters.
            </p>
            <button onClick={handleDownloadExport} disabled={downloading} className="btn btn-primary mt-4">
              <Download className="h-4 w-4" strokeWidth={1.8} />
              {downloading ? "Preparing the archive" : "Download the archive"}
            </button>
          </div>
        </section>

        <section className="panel border-alarm/40">
          <div className="panel-head border-alarm/25">
            <h3 className="panel-title flex items-center gap-2 text-alarm">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
              Delete the account
            </h3>
            <span className="folio text-alarm">irreversible</span>
          </div>
          <div className="px-5 py-4">
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-graphite">
              This removes the account, the records, the resume versions, the score history and the stored
              keys. There is no restore.
            </p>

            <div className="mt-4 max-w-sm">
              <label className="field-label">
                Type <span className="font-mono text-alarm">DELETE MY DATA</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE MY DATA"
                className="input font-mono"
              />

              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== "DELETE MY DATA" || deleting}
                className="btn btn-danger mt-3"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                {deleting ? "Erasing" : "Erase everything"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
