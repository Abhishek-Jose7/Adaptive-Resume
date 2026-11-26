/**
 * Safely parses any free-form date input (e.g. "2025", "Jan 2024", "2025 — 2026", "2026 — Present", "2028")
 * into a valid PostgreSQL DATE format ("YYYY-MM-DD") or null.
 * 
 * Guarantees zero SQL syntax errors (e.g. invalid input syntax for type date: "2025")
 * when inserting or updating bank_entries date columns in PostgreSQL.
 */
export function safePostgresDate(val: string | null | undefined, isEndDate: boolean = false): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    /^(present|current|now|ongoing|today|na|n\/a|null|undefined)$/i.test(trimmed)
  ) {
    return null;
  }

  // Handle ranges like "2025 — 2026" or "Jan 2024 - Dec 2024"
  if (/[-—–/]/.test(trimmed)) {
    const parts = trimmed.split(/\s*[-—–]\s*/);
    if (parts.length > 1) {
      const targetPart = isEndDate ? parts[parts.length - 1] : parts[0];
      return safePostgresDate(targetPart, isEndDate);
    }
  }

  // Remove common prefix words like "Since", "Graduating", "Class of", "ca.", "~"
  const clean = trimmed.replace(/^(?:since|graduating|class of|ca\.?|~)\s+/i, "").trim();

  const clampDay = (y: number, mNum: number, dNum: number) => {
    const maxDay = new Date(Date.UTC(y, mNum, 0)).getUTCDate();
    return String(Math.min(maxDay, Math.max(1, dNum))).padStart(2, "0");
  };

  // 1. Exact ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    if (y >= 1950 && y <= 2100) {
      const mNum = Math.min(12, Math.max(1, parseInt(isoMatch[2], 10)));
      const d = clampDay(y, mNum, parseInt(isoMatch[3], 10));
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  // 2. YYYY-MM or YYYY/MM
  const ymMatch = clean.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (ymMatch) {
    const y = parseInt(ymMatch[1], 10);
    if (y >= 1950 && y <= 2100) {
      const mNum = Math.min(12, Math.max(1, parseInt(ymMatch[2], 10)));
      const d = isEndDate ? clampDay(y, mNum, 31) : "01";
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  // 3. MM/YYYY or MM-YYYY
  const myMatch = clean.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (myMatch) {
    const y = parseInt(myMatch[2], 10);
    if (y >= 1950 && y <= 2100) {
      const mNum = Math.min(12, Math.max(1, parseInt(myMatch[1], 10)));
      const d = isEndDate ? clampDay(y, mNum, 31) : "01";
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  // 4. Year only: e.g. "2025" or "2028"
  const yearOnlyMatch = clean.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const y = parseInt(yearOnlyMatch[1], 10);
    if (y >= 1950 && y <= 2100) {
      return isEndDate ? `${y}-12-31` : `${y}-01-01`;
    }
  }

  // 5. Month name + Year: e.g. "Jan 2024", "January 2024", "Sept 2023", "Jun 2025"
  const monthNames: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const monthNameMatch = clean.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (monthNameMatch) {
    const yNum = parseInt(monthNameMatch[2], 10);
    if (yNum >= 1950 && yNum <= 2100) {
      const mStr = monthNameMatch[1].toLowerCase().substring(0, 3);
      const m = monthNames[mStr] || "01";
      const d = isEndDate ? "28" : "01";
      return `${yNum}-${m}-${d}`;
    }
  }

  // 6. Embedded 4-digit year: e.g. "Graduation 2028", "2026 Batch"
  const embeddedYear = clean.match(/\b(19\d{2}|20\d{2})\b/);
  if (embeddedYear) {
    const y = parseInt(embeddedYear[1], 10);
    return isEndDate ? `${y}-12-31` : `${y}-01-01`;
  }

  // 7. Standard Date.parse fallback
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const dObj = new Date(parsed);
    const y = dObj.getUTCFullYear();
    if (y >= 1950 && y <= 2100) {
      const m = String(dObj.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dObj.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Default fallback: return null to protect against invalid date syntax in Postgres
  return null;
}
