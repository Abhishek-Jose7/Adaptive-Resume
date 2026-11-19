"use client";

import React, { useState } from "react";
import { Copy, AlertCircle, X, Check } from "lucide-react";

interface DuplicateDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: {
    duplicateEntries: Array<{
      primaryId: string;
      duplicateId: string;
      reason: string;
      similarityScore: number;
    }>;
    duplicateBullets: Array<{
      primaryBulletId: string;
      duplicateBulletId: string;
      primaryText: string;
      duplicateText: string;
      reason: string;
      similarityScore: number;
    }>;
  } | null;
}

export function DuplicateDetectorModal({
  isOpen,
  onClose,
  duplicates,
}: DuplicateDetectorModalProps) {
  if (!isOpen || !duplicates) return null;

  const totalDuplicates =
    duplicates.duplicateEntries.length + duplicates.duplicateBullets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="bg-white rounded-lg shadow-plate w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-stamp" />
            <h2 className="text-base font-semibold text-ink">
              Duplicate Detection Report ({totalDuplicates} found)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-paper rounded text-graphite">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-graphite">
            Per PRD Section 8.4, duplicates are proposed for your manual review and are never automatically merged. Review the candidates below:
          </p>

          {/* Duplicate Entries */}
          <div>
            <h3 className="text-xs font-bold text-ink normal-case tracking-normal mb-2">
              Duplicate Career Entries ({duplicates.duplicateEntries.length})
            </h3>
            {duplicates.duplicateEntries.length === 0 ? (
              <p className="text-xs text-graphite italic">No duplicate career entries found.</p>
            ) : (
              <div className="space-y-2">
                {duplicates.duplicateEntries.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-paper text-xs">
                    <span className="font-semibold text-marker-dark block mb-1">
                      {item.reason}
                    </span>
                    <span className="text-graphite">
                      Entry IDs: <code className="bg-white px-1 py-0.5 border rounded">{item.primaryId}</code> vs{" "}
                      <code className="bg-white px-1 py-0.5 border rounded">{item.duplicateId}</code>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duplicate Bullets */}
          <div>
            <h3 className="text-xs font-bold text-ink normal-case tracking-normal mb-2">
              Near-Identical Achievement Bullets ({duplicates.duplicateBullets.length})
            </h3>
            {duplicates.duplicateBullets.length === 0 ? (
              <p className="text-xs text-graphite italic">No overlapping achievement bullets found.</p>
            ) : (
              <div className="space-y-3">
                {duplicates.duplicateBullets.map((bullet, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-paper text-xs space-y-1.5">
                    <div className="font-semibold text-stamp flex items-center justify-between">
                      <span>{bullet.reason}</span>
                      <span className="text-xs font-normal text-graphite">
                        {Math.round(bullet.similarityScore * 100)}% Match
                      </span>
                    </div>
                    <div className="p-2 bg-white border rounded">
                      <strong className="text-graphite block text-[10px] normal-case">Bullet A:</strong>
                      <p className="text-ink">{bullet.primaryText}</p>
                    </div>
                    <div className="p-2 bg-white border rounded">
                      <strong className="text-graphite block text-[10px] normal-case">Bullet B:</strong>
                      <p className="text-ink">{bullet.duplicateText}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sheet text-ink rounded-lg text-sm font-medium hover:bg-paper-deep"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
