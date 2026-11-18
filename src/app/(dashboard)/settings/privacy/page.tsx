"use client";

import React, { useState } from "react";
import { ShieldCheck, Download, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

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
        setDeleteStatus("Account successfully purged. Redirecting...");
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Privacy & Data Governance</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your personal data, export all your career records in machine-readable JSON, or exercise your Right to be
          Forgotten with instant, irreversible data eradication.
        </p>
      </div>

      {deleteStatus && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{deleteStatus}</span>
        </div>
      )}

      {/* Zero Training & Truth Guarantee Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Zero-Retention & Zero AI Model Training Guarantee</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Your career facts, employer names, compensation, and achievement metrics are strictly your personal property.
              Resume Maker never sells your data, never trains AI foundation models on your profile, and encrypts all
              external API integrations end-to-end.
            </p>
          </div>
        </div>
      </div>

      {/* Data Export Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-indigo-600" />
          Export All Account Data (GDPR / CCPA)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Download a complete portable archive containing every Data Bank item, verified bullet, numeric fact, tailored
          resume version, target job description, application stage, and cover letter in standard JSON format.
        </p>

        <button
          onClick={handleDownloadExport}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Preparing Archive..." : "Download Full JSON Archive"}
        </button>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-6">
        <h2 className="text-lg font-semibold text-rose-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          Danger Zone: Permanent Account Deletion
        </h2>
        <p className="text-sm text-rose-700 mb-4 leading-relaxed">
          This action will permanently eradicate your user account and cascade-delete all associated career history,
          resumes, ATS score records, tailored documents, and encrypted credentials. This cannot be undone.
        </p>

        <div className="max-w-md space-y-3">
          <label className="block text-xs font-semibold text-rose-900">
            Type <span className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">DELETE MY DATA</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY DATA"
            className="w-full text-sm border border-rose-300 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />

          <button
            onClick={handleDeleteAccount}
            disabled={confirmText !== "DELETE MY DATA" || deleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Purging All Records..." : "Permanently Erase Everything"}
          </button>
        </div>
      </div>
    </div>
  );
}
