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
        setCredentials(Array.isArray(data) ? data : data.data || []);
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
        const payload = result?.data ?? result;
        if (payload?.isValid) {
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
      <div className="mb-8 border-b border-[rgba(16,36,28,0.17)] pb-5">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#10241c] opacity-60">
          CONFIGURATION &amp; MODELS
        </span>
        <h2 className="mt-1 text-[28px] font-serif font-bold tracking-tight text-[#10241c]">
          AI settings
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-[#536259]">
          Choose how resume suggestions are prepared. You can add your own AI service key, or use the built-in option.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 flex items-start gap-2.5 rounded border p-3.5 text-[13px] ${
            statusMessage.type === "success"
              ? "border-[#315849]/40 bg-[#dce5df] text-[#315849]"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="target-panel lg:col-span-7">
          <div className="panel-title">
            <div>
              <span>ENCRYPTED VAULT</span>
              <h3>Stored keys</h3>
            </div>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded border border-[rgba(16,36,28,0.15)] bg-white text-[#10241c]">
              {credentials.length} on file
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[13px] text-[#536259]">Reading the vault...</p>
          ) : credentials.length === 0 ? (
            <div className="py-8 text-left">
              <p className="text-[15px] font-bold text-[#10241c]">Running on the local engine</p>
              <p className="mt-2 max-w-[50ch] text-[13px] leading-relaxed text-[#536259]">
                No external API key has been added. Tailoring still works seamlessly: it uses our
                truth-bound deterministic writer that selects and re-orders verified facts from your Career Vault.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[rgba(16,36,28,0.12)]">
              {credentials.map((cred) => (
                <li key={cred.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold capitalize text-[#10241c]">{cred.provider}</span>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                            cred.isValid
                              ? "bg-[#dce5df] text-[#315849] border border-[#315849]/30"
                              : "bg-[#e2dcd2] text-[#10241c] border border-[rgba(16,36,28,0.2)]"
                          }`}
                        >
                          {cred.isValid ? "verified" : "unverified"}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] text-[#536259]">
                        ••••{cred.last4}
                        {cred.lastTestedAt
                          ? ` · tested ${new Date(cred.lastTestedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestCredential(cred.id)}
                        disabled={testingId === cred.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border border-[rgba(16,36,28,0.2)] bg-white text-[#10241c] hover:bg-[#eee9df] transition-colors"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${testingId === cred.id ? "animate-spin" : ""}`}
                          strokeWidth={2}
                        />
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="p-1.5 text-[#536259] hover:text-red-700 transition-colors"
                        aria-label="Delete key"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vault-panel lg:col-span-5">
          <div className="panel-title">
            <div>
              <span>ADD CREDENTIAL</span>
              <h3>Add a key</h3>
            </div>
          </div>

          <form onSubmit={handleSaveCredential} className="space-y-4">
            <div>
              <label className="block text-[11.5px] font-bold text-[#10241c] uppercase tracking-wide mb-1.5">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full h-10 px-3 text-[13px] rounded border border-[rgba(16,36,28,0.2)] bg-white text-[#10241c] focus:outline-none focus:border-[#a98452]"
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
                <option value="openai_compatible">OpenAI-compatible endpoint</option>
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-[#10241c] uppercase tracking-wide mb-1.5">
                API key
              </label>
              <input
                type="password"
                placeholder="Paste the key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full h-10 px-3 text-[13px] font-mono rounded border border-[rgba(16,36,28,0.2)] bg-white text-[#10241c] focus:outline-none focus:border-[#a98452]"
              />
            </div>

            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#536259]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#315849]" strokeWidth={2} />
              Encrypted at rest with AES-256-GCM. Never logged, never shared.
            </p>

            <button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded bg-[#10241c] text-[#eee9df] text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm hover:shadow-[3px_3px_0_#d8c49b]"
            >
              <Key className="h-4 w-4" strokeWidth={1.8} />
              {submitting ? "Encrypting and storing..." : "Save key"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
