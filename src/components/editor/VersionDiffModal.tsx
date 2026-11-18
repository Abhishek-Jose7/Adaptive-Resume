"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  GitBranch,
  RotateCcw,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { ResumeVersionDiff, BulletDiffItem } from "@/types/resume";

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  versions: Array<{ id: string; versionNumber: number; triggerType: string; createdAt: string }>;
  onRestoreVersion?: (versionId: string) => Promise<void>;
  onBranchCreated?: () => void;
}

export function VersionDiffModal({
  isOpen,
  onClose,
  resumeId,
  versions,
  onRestoreVersion,
  onBranchCreated,
}: VersionDiffModalProps) {
  const [baseId, setBaseId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [diff, setDiff] = useState<ResumeVersionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [branching, setBranching] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize version selectors when versions load
  useEffect(() => {
    if (versions && versions.length >= 2) {
      setBaseId(versions[1].id);
      setTargetId(versions[0].id);
    } else if (versions && versions.length === 1) {
      setBaseId(versions[0].id);
      setTargetId(versions[0].id);
    }
  }, [versions]);

  const fetchDiff = async () => {
    if (!baseId || !targetId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/resume-versions/diff?baseId=${baseId}&targetId=${targetId}`);
      if (!res.ok) throw new Error("Failed to compute version difference");
      const data = await res.json();
      setDiff(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to load version diff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && baseId && targetId) {
      fetchDiff();
    }
  }, [isOpen, baseId, targetId]);

  if (!isOpen) return null;

  const handleBranch = async (versionId: string) => {
    setBranching(true);
    try {
      const res = await fetch(`/api/v1/resume-versions/${versionId}/branch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to branch version");
      setStatusMessage("New resume branch created successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
      if (onBranchCreated) onBranchCreated();
    } catch (err: any) {
      alert(err.message || "Failed to branch");
    } finally {
      setBranching(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore this version into the editor? Current unsaved changes will be replaced.")) {
      return;
    }
    setRestoring(true);
    try {
      if (onRestoreVersion) {
        await onRestoreVersion(versionId);
        setStatusMessage("Version restored to editor!");
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      alert(err.message || "Failed to restore version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-white">
        {/* Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Resume Version Diff Inspector
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                  PRD 18.5
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Bullet-level additions, deletions, rewrites, and Data Bank source provenance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="p-4 bg-gray-900/60 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Base (Older):</span>
              <select
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} ({v.triggerType}) - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-600 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Target (Newer):</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} ({v.triggerType}) - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBranch(targetId)}
              disabled={branching || !targetId}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium border border-gray-700 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              Branch Version
            </button>
            <button
              onClick={() => handleRestore(baseId)}
              disabled={restoring || !baseId}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Base
            </button>
          </div>
        </div>

        {/* Diff Metrics Banner */}
        {diff && (() => {
          const summary = diff.summary || diff.stats;
          return (
            <div className="px-5 py-2.5 bg-gray-900/30 border-b border-gray-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> {summary.addedCount} additions
                </span>
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" /> {summary.removedCount} deletions
                </span>
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> {summary.modifiedCount} rewrites
                </span>
                <span className="text-gray-400 flex items-center gap-1">
                  {summary.unchangedCount} unchanged
                </span>
              </div>
              {statusMessage && (
                <span className="text-emerald-400 font-medium">{statusMessage}</span>
              )}
            </div>
          );
        })()}

        {/* Main Diff Content Container */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-20 text-center text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
              <p className="text-xs">Computing semantic bullet differences and provenance maps...</p>
            </div>
          ) : !diff ? (
            <div className="text-center py-20 text-gray-500 text-xs">
              Select two versions above to see their line-by-line differences.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Details Diff */}
              {diff.profileDiff && (
                <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Profile &amp; Header Changes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2 bg-gray-950 rounded border border-gray-800/80">
                      <span className="text-gray-500 text-[10px] block">Base v{diff.baseVersionNumber}</span>
                      <p className="font-semibold text-white">{diff.profileDiff.baseName}</p>
                      <p className="text-gray-400 text-[11px]">{diff.profileDiff.baseEmail}</p>
                    </div>
                    <div className="p-2 bg-gray-950 rounded border border-gray-800/80">
                      <span className="text-gray-500 text-[10px] block">Target v{diff.targetVersionNumber}</span>
                      <p className="font-semibold text-white">{diff.profileDiff.targetName}</p>
                      <p className="text-gray-400 text-[11px]">{diff.profileDiff.targetEmail}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bullet Diffs List */}
              {(() => {
                const bulletList = diff.bullets || diff.bulletChanges || [];
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider px-1">
                      Bullet-Level Comparison ({bulletList.length})
                    </h4>

                    {bulletList.map((b: any, index: number) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-800 text-gray-400">
                      UNCHANGED
                    </span>
                  );
                  let rowBg = "bg-gray-900/40 border-gray-800/80";

                  if (b.type === "added") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> ADDED
                      </span>
                    );
                    rowBg = "bg-emerald-950/20 border-emerald-900/40";
                  } else if (b.type === "deleted") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center gap-1">
                        <Minus className="w-3 h-3" /> REMOVED
                      </span>
                    );
                    rowBg = "bg-rose-950/20 border-rose-900/40";
                  } else if (b.type === "modified") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> REWRITTEN
                      </span>
                    );
                    rowBg = "bg-amber-950/20 border-amber-900/40";
                  }

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${rowBg}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {badge}
                          <span className="text-[11px] text-gray-400 font-medium">
                            {b.sectionTitle}
                          </span>
                        </div>

                        {b.provenanceSources && b.provenanceSources.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                            <Database className="w-3 h-3" />
                            <span>Fact Provenance Linked</span>
                          </div>
                        )}
                      </div>

                      {/* Side-by-side or stacked diff view */}
                      {b.type === "modified" ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded-lg text-rose-200">
                            <span className="text-[10px] text-rose-400 font-mono block mb-0.5">
                              - Original (v{diff.baseVersionNumber}):
                            </span>
                            <p>{b.baseText}</p>
                          </div>
                          <div className="p-2 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-emerald-200">
                            <span className="text-[10px] text-emerald-400 font-mono block mb-0.5">
                              + Tailored (v{diff.targetVersionNumber}):
                            </span>
                            <p>{b.targetText}</p>
                          </div>
                        </div>
                      ) : b.type === "added" ? (
                        <div className="p-2 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-emerald-200">
                          <p>{b.targetText}</p>
                        </div>
                      ) : b.type === "deleted" ? (
                        <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded-lg text-rose-300 line-through">
                          <p>{b.baseText}</p>
                        </div>
                      ) : (
                        <p className="text-gray-300">{b.targetText}</p>
                      )}

                      {/* Supporting Data Bank Entries */}
                      {b.provenanceSources && b.provenanceSources.length > 0 && (
                        <div className="pt-1 text-[11px] text-gray-400 border-t border-gray-800/60 flex items-center gap-2">
                          <span className="text-gray-500 font-semibold text-[10px] uppercase">
                            Grounded in:
                          </span>
                          <span className="text-blue-300 font-medium">
                            {b.provenanceSources.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Immutable history: Restoring or branching never overwrites past records.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
