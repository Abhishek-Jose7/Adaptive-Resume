"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, CheckCircle2, AlertCircle, Trash2, RefreshCw, Plus, Cpu } from "lucide-react";

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
        setStatusMessage({ type: "success", text: `Successfully saved and encrypted ${selectedProvider} API key.` });
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
          setStatusMessage({ type: "success", text: "Provider credential test succeeded! Connection is valid." });
        } else {
          setStatusMessage({ type: "error", text: "Provider returned an invalid authentication response." });
        }
        await fetchCredentials();
      } else {
        setStatusMessage({ type: "error", text: "Failed to test provider connectivity." });
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
        setStatusMessage({ type: "success", text: "Credential removed successfully." });
        await fetchCredentials();
      } else {
        setStatusMessage({ type: "error", text: "Failed to delete credential." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to delete credential" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI & BYOK Provider Vault</h1>
        <p className="mt-1 text-sm text-gray-600">
          Bring Your Own Key (BYOK) for LLM acceleration. Keys are encrypted at rest with AES-256-GCM. If no keys are
          provided, Resume Maker runs in zero-cost offline local deterministic mode.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Vault Keys */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-blue-600" />
          Configured Provider Credentials
        </h2>

        {loading ? (
          <div className="text-sm text-gray-500 py-4">Loading credentials...</div>
        ) : credentials.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Cpu className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Running in Local Deterministic Mode</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              No external API keys are configured. The app currently runs using the built-in deterministic offline engine
              with zero external network requests and $0 operating cost.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {credentials.map((cred) => (
              <div key={cred.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 capitalize text-sm">{cred.provider}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cred.isValid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {cred.isValid ? "Verified Active" : "Verification Failed"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                    <span>Key: ••••••••••••{cred.last4}</span>
                    {cred.lastTestedAt && (
                      <span>Last tested: {new Date(cred.lastTestedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestCredential(cred.id)}
                    disabled={testingId === cred.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingId === cred.id ? "animate-spin" : ""}`} />
                    Test Connection
                  </button>
                  <button
                    onClick={() => handleDeleteCredential(cred.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Update Key Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-emerald-600" />
          Add or Replace Provider Key
        </h2>

        <form onSubmit={handleSaveCredential} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="gemini">Google Gemini (Recommended Free-Tier)</option>
                <option value="groq">Groq (High-Speed Llama-3 Free-Tier)</option>
                <option value="openai_compatible">OpenAI Compatible Endpoint</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                placeholder="Paste API Key (e.g. AIza... or gsk_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Keys are encrypted with AES-256-GCM and never logged or exposed.</span>
            </div>

            <button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Encrypting & Storing..." : "Save Provider Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
