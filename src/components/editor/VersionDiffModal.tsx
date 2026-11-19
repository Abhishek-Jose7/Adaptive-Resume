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
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-rule rounded-lg max-w-4xl w-full overflow-hidden shadow-plate flex flex-col max-h-[92vh] text-ink">
        {/* Header */}
        <div className="p-4 bg-sheet border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stamp-soft border border-stamp/30 rounded-lg text-stamp">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Resume Version Diff Inspector
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-stamp-soft text-stamp border border-stamp/30 rounded-full">
                  PRD 18.5
                </span>
              </h3>
              <p className="text-xs text-graphite">
                Bullet-level additions, deletions, rewrites, and Data Bank source provenance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-graphite hover:text-ink p-1 rounded-lg hover:bg-paper-deep"
          >
            ✕
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="p-4 bg-sheet/60 border-b border-rule flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-graphite font-medium">Base (Older):</span>
              <select
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                className="bg-sheet border border-rule rounded-lg px-2.5 py-1 text-ink text-xs focus:outline-none focus:border-stamp"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} ({v.triggerType}) - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-graphite hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-graphite font-medium">Target (Newer):</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="bg-sheet border border-rule rounded-lg px-2.5 py-1 text-ink text-xs focus:outline-none focus:border-stamp"
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
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg text-xs font-medium border border-rule transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-stamp" />
              Branch Version
            </button>
            <button
              onClick={() => handleRestore(baseId)}
              disabled={restoring || !baseId}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stamp hover:bg-stamp-dark text-white rounded-lg text-xs font-semibold shadow-none transition-all"
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
            <div className="px-5 py-2.5 bg-sheet/30 border-b border-rule flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-press font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> {summary.addedCount} additions
                </span>
                <span className="text-alarm font-medium flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" /> {summary.removedCount} deletions
                </span>
                <span className="text-marker-dark font-medium flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> {summary.modifiedCount} rewrites
                </span>
                <span className="text-graphite flex items-center gap-1">
                  {summary.unchangedCount} unchanged
                </span>
              </div>
              {statusMessage && (
                <span className="text-press font-medium">{statusMessage}</span>
              )}
            </div>
          );
        })()}

        {/* Main Diff Content Container */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-20 text-center text-graphite space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stamp" />
              <p className="text-xs">Computing semantic bullet differences and provenance maps...</p>
            </div>
          ) : !diff ? (
            <div className="text-center py-20 text-graphite text-xs">
              Select two versions above to see their line-by-line differences.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Details Diff */}
              {diff.profileDiff && (
                <div className="p-3 bg-sheet/80 border border-rule rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-ink normal-case tracking-normal">
                    Profile &amp; Header Changes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2 bg-paper rounded border border-rule/80">
                      <span className="text-graphite text-[10px] block">Base v{diff.baseVersionNumber}</span>
                      <p className="font-semibold text-ink">{diff.profileDiff.baseName}</p>
                      <p className="text-graphite text-[11px]">{diff.profileDiff.baseEmail}</p>
                    </div>
                    <div className="p-2 bg-paper rounded border border-rule/80">
                      <span className="text-graphite text-[10px] block">Target v{diff.targetVersionNumber}</span>
                      <p className="font-semibold text-ink">{diff.profileDiff.targetName}</p>
                      <p className="text-graphite text-[11px]">{diff.profileDiff.targetEmail}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bullet Diffs List */}
              {(() => {
                const bulletList = diff.bullets || diff.bulletChanges || [];
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-ink normal-case tracking-normal px-1">
                      Bullet-Level Comparison ({bulletList.length})
                    </h4>

                    {bulletList.map((b: any, index: number) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-paper-deep text-graphite">
                      UNCHANGED
                    </span>
                  );
                  let rowBg = "bg-sheet/40 border-rule/80";

                  if (b.type === "added") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-press-soft text-press border border-press/60 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> ADDED
                      </span>
                    );
                    rowBg = "bg-press-soft border-press/40";
                  } else if (b.type === "deleted") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-alarm-soft text-alarm border border-alarm/60 flex items-center gap-1">
                        <Minus className="w-3 h-3" /> REMOVED
                      </span>
                    );
                    rowBg = "bg-alarm-soft border-alarm/40";
                  } else if (b.type === "modified") {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-marker-soft text-marker-dark border border-marker/60 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> REWRITTEN
                      </span>
                    );
                    rowBg = "bg-marker-soft border-marker/40";
                  }

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${rowBg}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {badge}
                          <span className="text-[11px] text-graphite font-medium">
                            {b.sectionTitle}
                          </span>
                        </div>

                        {b.provenanceSources && b.provenanceSources.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-stamp font-mono">
                            <Database className="w-3 h-3" />
                            <span>Fact Provenance Linked</span>
                          </div>
                        )}
                      </div>

                      {/* Side-by-side or stacked diff view */}
                      {b.type === "modified" ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="p-2 bg-alarm-soft border border-alarm/40 rounded-lg text-alarm">
                            <span className="text-[10px] text-alarm font-mono block mb-0.5">
                              - Original (v{diff.baseVersionNumber}):
                            </span>
                            <p>{b.baseText}</p>
                          </div>
                          <div className="p-2 bg-press-soft border border-press/40 rounded-lg text-press">
                            <span className="text-[10px] text-press font-mono block mb-0.5">
                              + Tailored (v{diff.targetVersionNumber}):
                            </span>
                            <p>{b.targetText}</p>
                          </div>
                        </div>
                      ) : b.type === "added" ? (
                        <div className="p-2 bg-press-soft border border-press/40 rounded-lg text-press">
                          <p>{b.targetText}</p>
                        </div>
                      ) : b.type === "deleted" ? (
                        <div className="p-2 bg-alarm-soft border border-alarm/40 rounded-lg text-alarm line-through">
                          <p>{b.baseText}</p>
                        </div>
                      ) : (
                        <p className="text-ink">{b.targetText}</p>
                      )}

                      {/* Supporting Data Bank Entries */}
                      {b.provenanceSources && b.provenanceSources.length > 0 && (
                        <div className="pt-1 text-[11px] text-graphite border-t border-rule/60 flex items-center gap-2">
                          <span className="text-graphite font-semibold text-[10px] normal-case">
                            Grounded in:
                          </span>
                          <span className="text-stamp font-medium">
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
        <div className="p-4 bg-sheet border-t border-rule flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-graphite">
            <ShieldCheck className="w-4 h-4 text-press" />
            <span>Immutable history: Restoring or branching never overwrites past records.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-paper-deep hover:bg-paper-deep text-ink rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
