import JSZip from "jszip";
import { validateFileBuffer } from "./fileValidator";

export interface LinkedInParsedItem {
  entryType: "experience" | "education" | "skill_group" | "project";
  title: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  descriptionContext?: string;
  bullets: string[];
}

export interface LinkedInExportResult {
  items: LinkedInParsedItem[];
  fileList: string[];
}

/**
 * Simple, robust CSV parser handling quoted strings and commas
 */
function parseCsv(csvText: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (insideQuotes && csvText[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim().replace(/^"|"$/g, ""));
      currentVal = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && csvText[i + 1] === "\n") i++;
      currentRow.push(currentVal.trim().replace(/^"|"$/g, ""));
      currentVal = "";
      if (currentRow.length > 0 && currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim().replace(/^"|"$/g, ""));
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^"|"$/g, "").trim());
  const records: Array<Record<string, string>> = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.length === headers.length) {
      const rec: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        rec[headers[j]] = values[j];
      }
      records.push(rec);
    }
  }

  return records;
}

export async function parseLinkedInZip(
  buffer: ArrayBuffer | Uint8Array
): Promise<LinkedInExportResult> {
  const validation = validateFileBuffer(buffer, "linkedin.zip");
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  const zip = await JSZip.loadAsync(buffer);
  const fileList = Object.keys(zip.files);
  const items: LinkedInParsedItem[] = [];

  // 1. Parse Positions.csv
  const positionsFile = Object.values(zip.files).find((f) =>
    /positions\.csv$/i.test(f.name)
  );
  if (positionsFile) {
    const content = await positionsFile.async("string");
    const rows = parseCsv(content);

    for (const r of rows) {
      const title = r["Title"] || r["title"] || "Role";
      const organization = r["Company Name"] || r["company"] || r["Company"] || "";
      const description = r["Description"] || r["description"] || "";
      const location = r["Location"] || r["location"] || "";
      const startDate = r["Started On"] || r["start_date"] || "";
      const endDate = r["Finished On"] || r["end_date"] || "";

      // Split multiline descriptions into atomic bullet candidates
      const bullets = description
        ? description
            .split(/\r?\n|•|- /)
            .map((b) => b.trim())
            .filter((b) => b.length > 5)
        : [];

      items.push({
        entryType: "experience",
        title,
        organization,
        location,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isCurrent: !endDate || endDate.toLowerCase().includes("present"),
        descriptionContext: description,
        bullets,
      });
    }
  }

  // 2. Parse Education.csv
  const educationFile = Object.values(zip.files).find((f) =>
    /education\.csv$/i.test(f.name)
  );
  if (educationFile) {
    const content = await educationFile.async("string");
    const rows = parseCsv(content);

    for (const r of rows) {
      const school = r["School Name"] || r["school"] || "University";
      const degree = r["Degree Name"] || r["degree"] || "Degree";
      const notes = r["Notes"] || r["notes"] || "";
      const startDate = r["Start Date"] || "";
      const endDate = r["End Date"] || "";

      items.push({
        entryType: "education",
        title: degree,
        organization: school,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isCurrent: false,
        descriptionContext: notes,
        bullets: notes ? [notes] : [],
      });
    }
  }

  // 3. Parse Skills.csv
  const skillsFile = Object.values(zip.files).find((f) =>
    /skills\.csv$/i.test(f.name)
  );
  if (skillsFile) {
    const content = await skillsFile.async("string");
    const rows = parseCsv(content);
    const skillNames = rows.map((r) => r["Name"] || r["name"]).filter(Boolean);

    if (skillNames.length > 0) {
      items.push({
        entryType: "skill_group",
        title: "Imported Skills",
        bullets: skillNames,
      });
    }
  }

  return { items, fileList };
}
