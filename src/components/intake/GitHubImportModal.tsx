"use client";

import React, { useState } from "react";
import { GitHubImportService, GitHubRepoSummary } from "@/lib/services/githubImportService";
import { FolderGit2, X, Star, RefreshCw, AlertCircle, Check } from "lucide-react";

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReposSelected: (stagedItems: any[]) => Promise<void>;
}

export function GitHubImportModal({
  isOpen,
  onClose,
  onReposSelected,
}: GitHubImportModalProps) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchRepos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const fetched = await GitHubImportService.fetchUserRepos({
        username: username.trim(),
        token: token.trim() || undefined,
      });
      setRepos(fetched);
      setSelectedRepoNames(new Set(fetched.slice(0, 5).map((r) => r.name)));
    } catch (err: any) {
      setError(err.message || "Failed to fetch repositories.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRepo = (name: string) => {
    const next = new Set(selectedRepoNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedRepoNames(next);
  };

  const handleImport = async () => {
    const chosen = repos.filter((r) => selectedRepoNames.has(r.name));
    if (chosen.length === 0) return;

    const staged = GitHubImportService.transformReposToProjectItems(chosen);
    await onReposSelected(staged);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">Import GitHub Repositories</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleFetchRepos} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  GitHub Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. torvalds"
                  className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Personal Token (Optional)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Fetch Repositories
            </button>
          </form>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {repos.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Select repositories to stage as Project entries:</span>
                <span>{selectedRepoNames.size} selected</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-gray-50">
                {repos.map((repo) => {
                  const isChecked = selectedRepoNames.has(repo.name);
                  return (
                    <div
                      key={repo.name}
                      onClick={() => toggleRepo(repo.name)}
                      className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? "bg-purple-50/70 border-purple-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-purple-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-semibold text-gray-900">
                          <span>{repo.name}</span>
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-normal">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {repo.stars}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-gray-600 text-[11px] line-clamp-1 mt-0.5">
                            {repo.description}
                          </p>
                        )}
                        {repo.language && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleImport}
                disabled={selectedRepoNames.size === 0}
                className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                Stage {selectedRepoNames.size} Selected Repositories
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
