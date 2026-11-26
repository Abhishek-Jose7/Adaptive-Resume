"use client";

import React, { useEffect, useState } from "react";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { CheckCircle2, AlertCircle, Save, RefreshCw, FileText, Globe2, Shield } from "lucide-react";

interface WorkspaceSettings {
  defaultPageSize: "A4" | "LETTER";
  defaultTemplateId: string;
  themePreference: "system" | "light" | "dark";
  retentionPolicy: "discard_raw" | "keep_redacted" | "keep_raw";
  portfolioTheme: "editorial" | "modern" | "minimal";
  showViewCounters: boolean;
  privacyTermsVersion: string;
  updatedAt?: string;
}

const TEMPLATES = [
  { id: "classic-ats", label: "Classic ATS (Single Column Serif)" },
  { id: "modern-ats", label: "Modern ATS (Clean Sans)" },
  { id: "minimal-executive", label: "Minimal Executive" },
  { id: "technical-scholar", label: "Technical Scholar" },
  { id: "luxurious-grid", label: "Luxurious Grid (Two Column)" },
  { id: "compact-engineer", label: "Compact Engineer" },
];

export default function WorkspaceSettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings>({
    defaultPageSize: "A4",
    defaultTemplateId: "classic-ats",
    themePreference: "system",
    retentionPolicy: "discard_raw",
    portfolioTheme: "editorial",
    showViewCounters: true,
    privacyTermsVersion: "2026-11-18",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load workspace settings");
        return res.json();
      })
      .then((json) => {
        const data = json?.data ?? json;
        if (active && data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => {
        if (active) setStatus({ type: "error", text: err?.message || "Failed to load settings" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPageSize: settings.defaultPageSize,
          defaultTemplateId: settings.defaultTemplateId,
          themePreference: settings.themePreference,
          retentionPolicy: settings.retentionPolicy,
          portfolioTheme: settings.portfolioTheme,
          showViewCounters: settings.showViewCounters,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to save settings");
      }
      const updated = json?.data ?? json;
      setSettings((prev) => ({ ...prev, ...updated }));
      setStatus({ type: "success", text: "Workspace settings saved to your account." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      setStatus({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="mb-5 border-b border-rule pb-5">
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
          Workspace settings
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
          Choose your default paper size, template, privacy retention rules, and public portfolio style.
        </p>
      </header>

      <SettingsNav />

      {status && (
        <div
          className={`mb-5 flex items-start gap-2 border px-3 py-2 text-[12.5px] ${
            status.type === "success"
              ? "border-press/30 bg-press-soft text-press"
              : "border-alarm/35 bg-alarm-soft text-alarm"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-graphite">
          <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
          Loading workspace preferences
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <section className="panel px-5 py-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-rule pb-2">
              <FileText className="h-4 w-4 text-stamp" />
              <h3 className="font-display text-[15px] font-semibold">Document &amp; Export Defaults</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Default Page Size</label>
                <select
                  value={settings.defaultPageSize}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultPageSize: e.target.value as "A4" | "LETTER",
                    }))
                  }
                  className="input"
                >
                  <option value="A4">A4 (210 × 297 mm — International)</option>
                  <option value="LETTER">US Letter (8.5 × 11 in — North America)</option>
                </select>
                <p className="mt-1 text-[11.5px] text-graphite">
                  Applied to new resumes, print/PDF exports, and DOCX page geometry.
                </p>
              </div>

              <div>
                <label className="field-label">Default Resume Template</label>
                <select
                  value={settings.defaultTemplateId}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultTemplateId: e.target.value }))}
                  className="input"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11.5px] text-graphite">
                  Default visual layout used when creating new tailored drafts.
                </p>
              </div>
            </div>
          </section>

          <section className="panel px-5 py-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-rule pb-2">
              <Globe2 className="h-4 w-4 text-stamp" />
              <h3 className="font-display text-[15px] font-semibold">Public Portfolio &amp; Share Analytics</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Public Portfolio Theme (/u/username)</label>
                <select
                  value={settings.portfolioTheme}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      portfolioTheme: e.target.value as "editorial" | "modern" | "minimal",
                    }))
                  }
                  className="input"
                >
                  <option value="editorial">Editorial Paper (Warm Serif)</option>
                  <option value="modern">Modern Slate (Sharp Sans)</option>
                  <option value="minimal">Minimalist Contrast (Ink &amp; Mono)</option>
                </select>
              </div>

              <div className="flex items-start pt-5">
                <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={settings.showViewCounters}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showViewCounters: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <strong className="block font-medium">Show view counters on shares &amp; portfolio</strong>
                    <span className="text-[11.5px] text-graphite">
                      Track recruiter views on expiring snapshots and display total views on your public record.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <section className="panel px-5 py-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-rule pb-2">
              <Shield className="h-4 w-4 text-press" />
              <h3 className="font-display text-[15px] font-semibold">Privacy &amp; Retention Default</h3>
            </div>

            <div>
              <label className="field-label">Uploaded File Retention Policy</label>
              <select
                value={settings.retentionPolicy}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    retentionPolicy: e.target.value as "discard_raw" | "keep_redacted" | "keep_raw",
                  }))
                }
                className="input max-w-md"
              >
                <option value="discard_raw">Discard raw PDF/DOCX immediately after extraction (Recommended)</option>
                <option value="keep_redacted">Keep redacted snippet audit evidence only</option>
              </select>
              <p className="mt-1 text-[11.5px] text-graphite">
                Policy version: <span className="font-mono">{settings.privacyTermsVersion}</span>
              </p>
            </div>
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save className="h-4 w-4" />
              {saving ? "Saving settings..." : "Save workspace settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
