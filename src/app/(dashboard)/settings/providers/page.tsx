"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, CheckCircle2, AlertCircle, Trash2, RefreshCw, Plus } from "lucide-react";

interface CredentialSummary {
  id: string;
  provider: string;
  last4: string;
  isValid: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProvidersSettingsPage() {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCredentials = async () => {
    try {
      const res = await fetch("/api/v1/provider-credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/v1/provider-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: `${selectedProvider} key saved and encrypted.` });
        setApiKey("");
        await fetchCredentials();
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error?.message || "Failed to save API key" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An unexpected error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestCredential = async (id: string) => {
    setTestingId(id);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/v1/provider-credentials/${id}/test`, {
        method: "POST",
      });

      if (res.ok) {
        const result = await res.json();
        if (result.data?.isValid) {
          setStatusMessage({ type: "success", text: "Connection valid. The provider accepted the key." });
        } else {
          setStatusMessage({ type: "error", text: "The provider rejected this key." });
        }
        await fetchCredentials();
      } else {
        setStatusMessage({ type: "error", text: "Could not reach the provider." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Test connection failed" });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to remove this API key?")) return;

    try {
      const res = await fetch(`/api/v1/provider-credentials/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: "Key removed." });
        await fetchCredentials();
      } else {
        setStatusMessage({ type: "error", text: "Failed to delete credential." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to delete credential" });
    }
  };

  return (
    <div>
      <header className="mb-6 border-b border-rule pb-5">
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tightest">
          AI settings
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-graphite">
          Choose how resume suggestions are prepared. You can add your own AI service key, or use the built-in option.
        </p>
      </header>

      {statusMessage && (
        <div
          className={`mb-5 flex items-start gap-2 border px-3 py-2 text-[12.5px] ${
            statusMessage.type === "success"
              ? "border-press/30 bg-press-soft text-press"
              : "border-alarm/35 bg-alarm-soft text-alarm"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="panel lg:col-span-3">
          <div className="panel-head">
            <h3 className="panel-title">Stored keys</h3>
            <span className="folio">{credentials.length} on file</span>
          </div>

          {loading ? (
            <p className="px-5 py-6 text-[13px] text-graphite">Reading the vault</p>
          ) : credentials.length === 0 ? (
            <div className="px-5 py-8">
              <p className="text-[13.5px] font-medium">Running on the local engine</p>
              <p className="mt-1.5 max-w-[48ch] text-[13px] leading-relaxed text-graphite">
                No key has been added. Tailoring still works: it uses the deterministic writer that only
                re-orders facts you already recorded.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {credentials.map((cred) => (
                <li key={cred.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold capitalize">{cred.provider}</span>
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[10px] ${
                            cred.isValid
                              ? "border-press/30 bg-press-soft text-press"
                              : "border-marker/40 bg-marker-soft text-marker-dark"
                          }`}
                        >
                          {cred.isValid ? "verified" : "unverified"}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] text-graphite">
                        ••••{cred.last4}
                        {cred.lastTestedAt
                          ? ` · tested ${new Date(cred.lastTestedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestCredential(cred.id)}
                        disabled={testingId === cred.id}
                        className="btn btn-sm"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${testingId === cred.id ? "animate-spin" : ""}`}
                          strokeWidth={1.8}
                        />
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="btn btn-icon hover:text-alarm"
                        aria-label="Delete key"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel lg:col-span-2">
          <div className="panel-head">
            <h3 className="panel-title flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-stamp" strokeWidth={1.9} />
              Add a key
            </h3>
          </div>

          <form onSubmit={handleSaveCredential} className="space-y-3.5 px-5 py-4">
            <div>
              <label className="field-label">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="select"
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
                <option value="openai_compatible">OpenAI-compatible endpoint</option>
              </select>
            </div>

            <div>
              <label className="field-label">API key</label>
              <input
                type="password"
                placeholder="Paste the key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="input font-mono"
              />
            </div>

            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-graphite">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-press" strokeWidth={1.8} />
              Encrypted at rest. Never logged, never sent anywhere except the provider you chose.
            </p>

            <button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              className="btn btn-primary w-full"
            >
              <Key className="h-4 w-4" strokeWidth={1.8} />
              {submitting ? "Encrypting and storing" : "Save key"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
