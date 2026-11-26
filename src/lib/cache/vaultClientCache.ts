import type { BankEntry, CompletenessReport } from "@/types/bank";

export interface VaultCachedSnapshot {
  items: BankEntry[];
  completeness?: CompletenessReport;
  fetchedAt: number;
}

const STORAGE_KEY = "ar_vault_cache_v2";
const RESUMES_STORAGE_KEY = "ar_resumes_cache_v1";
const CACHE_TTL_MS = 120_000; // 2 minutes stale-while-revalidate window

let memorySnapshot: VaultCachedSnapshot | null = null;
let inflightBankRequest: Promise<VaultCachedSnapshot> | null = null;

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
}

function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Counts unique individual skills across all `skill_group` and `skill` entries,
 * splitting grouped strings (e.g. "Python, TypeScript, SQL") into individual skills.
 */
export function countIndividualSkills(
  entries: Array<{
    entryType: string;
    title?: string;
    bullets?: Array<{ text: string }>;
  }>
): number {
  const uniqueSkills = new Set<string>();

  for (const entry of entries) {
    if (entry.entryType !== "skill_group" && entry.entryType !== "skill") continue;
    const bullets = entry.bullets || [];
    if (bullets.length === 0) {
      if (entry.entryType === "skill" && entry.title?.trim()) {
        uniqueSkills.add(entry.title.trim().toLowerCase());
      }
      continue;
    }

    for (const bullet of bullets) {
      const text = (bullet.text || "").trim();
      if (!text) continue;
      // Strip optional "Category: ..." prefix before splitting items
      const colonIdx = text.indexOf(":");
      const rawBody = colonIdx > 0 && colonIdx < 28 ? text.slice(colonIdx + 1) : text;
      const tokens = rawBody
        .split(/[,•|\n;]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      for (const token of tokens) {
        uniqueSkills.add(token.toLowerCase());
      }
    }
  }

  return uniqueSkills.size;
}

export function getCachedVaultSnapshot(): VaultCachedSnapshot | null {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = readStorage(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultCachedSnapshot;
    if (parsed && Array.isArray(parsed.items)) {
      memorySnapshot = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export function setCachedVaultSnapshot(snapshot: VaultCachedSnapshot): void {
  memorySnapshot = snapshot;
  try {
    writeStorage(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore serialization errors
  }
}

export function invalidateVaultCache(): void {
  memorySnapshot = null;
  inflightBankRequest = null;
  removeStorage(STORAGE_KEY);
  removeStorage(RESUMES_STORAGE_KEY);
}

/**
 * Deduplicates simultaneous /api/v1/bank/entries?limit=100 fetches across layout and pages,
 * returning fresh cache immediately when valid or revalidating in a single network round-trip.
 */
export async function fetchBankEntriesCached(options?: {
  forceRefresh?: boolean;
}): Promise<VaultCachedSnapshot> {
  const cached = getCachedVaultSnapshot();
  const isFresh = Boolean(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);

  if (!options?.forceRefresh && isFresh && cached) {
    return cached;
  }

  if (inflightBankRequest) {
    return inflightBankRequest;
  }

  inflightBankRequest = fetch("/api/v1/bank/entries?limit=100", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to load Career Vault entries");
      }
      const data = await res.json();
      const snapshot: VaultCachedSnapshot = {
        items: Array.isArray(data?.items) ? data.items : [],
        completeness: data?.completeness,
        fetchedAt: Date.now(),
      };
      setCachedVaultSnapshot(snapshot);
      return snapshot;
    })
    .finally(() => {
      inflightBankRequest = null;
    });

  return inflightBankRequest;
}

export function getCachedResumesList<T = unknown>(): T[] | null {
  try {
    const raw = readStorage(RESUMES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setCachedResumesList<T = unknown>(list: T[]): void {
  try {
    writeStorage(RESUMES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore serialization errors
  }
}
