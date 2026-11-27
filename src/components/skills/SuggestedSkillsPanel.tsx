"use client";

import React, { useEffect, useState } from "react";
import { Plus, Check, Sparkles, LoaderCircle } from "lucide-react";
import type { BankEntry } from "@/types/bank";
import type { RoleSkillSuggestions, SuggestedSkillItem } from "@/lib/scoring/roleFitInsight";
import { addSkillsToVault } from "@/lib/cache/vaultClientCache";

interface SuggestedSkillsPanelProps {
  suggestions?: RoleSkillSuggestions | null;
  bankEntries: Array<{
    id: string;
    entryType: string;
    title: string;
    bullets?: Array<{ text: string }>;
  }>;
  onVaultUpdated?: (updatedEntries: BankEntry[]) => void;
  compact?: boolean;
}

export function SuggestedSkillsPanel({
  suggestions,
  bankEntries,
  onVaultUpdated,
  compact = false,
}: SuggestedSkillsPanelProps) {
  const [addedMap, setAddedMap] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<"tech" | "soft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const techItems = suggestions?.technicalAndTools || [];
  const softItems = suggestions?.softSkills || [];

  // Reset optimistic status banner when a fresh suggestion list arrives
  useEffect(() => {
    setError(null);
    setStatusMessage(null);
  }, [techItems.length, softItems.length]);

  if (techItems.length === 0 && softItems.length === 0) {
    return null;
  }

  const handleAddSingle = async (item: SuggestedSkillItem) => {
    const key = item.skill.toLowerCase();
    if (addedMap[key] || busyKey || bulkBusy) return;
    setBusyKey(key);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await addSkillsToVault(
        [{ skill: item.skill, vaultGroup: item.vaultGroup }],
        bankEntries,
      );
      setAddedMap((prev) => ({ ...prev, [key]: item.vaultGroup }));
      setStatusMessage(`Added "${item.skill}" to ${item.vaultGroup} in Career Vault.`);
      onVaultUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add skill to Career Vault.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddGroup = async (kind: "tech" | "soft", list: SuggestedSkillItem[]) => {
    const remaining = list.filter((item) => !addedMap[item.skill.toLowerCase()]);
    if (remaining.length === 0 || busyKey || bulkBusy) return;
    setBulkBusy(kind);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await addSkillsToVault(
        remaining.map((item) => ({ skill: item.skill, vaultGroup: item.vaultGroup })),
        bankEntries,
      );
      setAddedMap((prev) => {
        const next = { ...prev };
        for (const item of remaining) {
          next[item.skill.toLowerCase()] = item.vaultGroup;
        }
        return next;
      });
      setStatusMessage(
        `Added ${remaining.length} ${kind === "soft" ? "soft skill" : "technical skill"}${remaining.length === 1 ? "" : "s"} to Career Vault.`,
      );
      onVaultUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add skills to Career Vault.");
    } finally {
      setBulkBusy(null);
    }
  };

  const remainingTech = techItems.filter((i) => !addedMap[i.skill.toLowerCase()]);
  const remainingSoft = softItems.filter((i) => !addedMap[i.skill.toLowerCase()]);

  return (
    <div className={`suggested-skills-card${compact ? " is-compact" : ""}`}>
      <div className="suggested-skills-header">
        <div>
          <span className="suggested-skills-eyebrow">
            <Sparkles size={13} aria-hidden="true" /> Suggested Skills to Add
          </span>
          <p className="suggested-skills-subtitle">
            Only add skills &amp; soft skills you genuinely have — click to confirm into your Career Vault.
          </p>
        </div>
      </div>

      {error && (
        <div className="suggested-skills-error" role="alert">
          {error}
        </div>
      )}
      {statusMessage && (
        <div className="suggested-skills-status" role="status">
          <Check size={13} aria-hidden="true" /> {statusMessage}
        </div>
      )}

      {techItems.length > 0 && (
        <div className="suggested-skills-group">
          <div className="suggested-group-row">
            <span className="suggested-group-label">Technical Skills &amp; Tools ({techItems.length})</span>
            {remainingTech.length > 1 && (
              <button
                type="button"
                className="suggested-bulk-btn"
                disabled={Boolean(bulkBusy || busyKey)}
                onClick={() => void handleAddGroup("tech", techItems)}
              >
                {bulkBusy === "tech" ? (
                  <>
                    <LoaderCircle size={12} className="spin" aria-hidden="true" /> Adding…
                  </>
                ) : (
                  <>+ Add all ({remainingTech.length})</>
                )}
              </button>
            )}
          </div>
          <div className="suggested-pill-list">
            {techItems.map((item) => {
              const key = item.skill.toLowerCase();
              const isAdded = Boolean(addedMap[key]);
              const isLoading = busyKey === key;
              return (
                <button
                  key={item.skill}
                  type="button"
                  title={`${item.reason} · Adds to "${item.vaultGroup}"`}
                  disabled={isAdded || Boolean(busyKey || bulkBusy)}
                  className={`suggested-skill-pill${isAdded ? " is-added" : ""}`}
                  onClick={() => void handleAddSingle(item)}
                >
                  {isAdded ? (
                    <Check size={12} aria-hidden="true" />
                  ) : isLoading ? (
                    <LoaderCircle size={12} className="spin" aria-hidden="true" />
                  ) : (
                    <Plus size={12} aria-hidden="true" />
                  )}
                  <span>{item.skill}</span>
                  {!compact && <small>{isAdded ? "Added" : item.vaultGroup}</small>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {softItems.length > 0 && (
        <div className="suggested-skills-group">
          <div className="suggested-group-row">
            <span className="suggested-group-label">Soft Skills &amp; Practices ({softItems.length})</span>
            {remainingSoft.length > 1 && (
              <button
                type="button"
                className="suggested-bulk-btn"
                disabled={Boolean(bulkBusy || busyKey)}
                onClick={() => void handleAddGroup("soft", softItems)}
              >
                {bulkBusy === "soft" ? (
                  <>
                    <LoaderCircle size={12} className="spin" aria-hidden="true" /> Adding…
                  </>
                ) : (
                  <>+ Add all soft skills ({remainingSoft.length})</>
                )}
              </button>
            )}
          </div>
          <div className="suggested-pill-list">
            {softItems.map((item) => {
              const key = item.skill.toLowerCase();
              const isAdded = Boolean(addedMap[key]);
              const isLoading = busyKey === key;
              return (
                <button
                  key={item.skill}
                  type="button"
                  title={`${item.reason} · Adds to "${item.vaultGroup}"`}
                  disabled={isAdded || Boolean(busyKey || bulkBusy)}
                  className={`suggested-skill-pill is-soft${isAdded ? " is-added" : ""}`}
                  onClick={() => void handleAddSingle(item)}
                >
                  {isAdded ? (
                    <Check size={12} aria-hidden="true" />
                  ) : isLoading ? (
                    <LoaderCircle size={12} className="spin" aria-hidden="true" />
                  ) : (
                    <Plus size={12} aria-hidden="true" />
                  )}
                  <span>{item.skill}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
