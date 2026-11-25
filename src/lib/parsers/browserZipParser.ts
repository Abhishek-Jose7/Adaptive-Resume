import JSZip from "jszip";
import { validateFileBuffer } from "./fileValidator";

export interface LinkedInParsedItem {
  entryType: "profile" | "experience" | "education" | "skill_group" | "project" | "certification" | "award";
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
    const skillNames = Array.from(new Set(rows.map((r) => (r["Name"] || r["name"] || "").trim()).filter(Boolean)));

    if (skillNames.length > 0) {
      items.push({
        entryType: "skill_group",
        title: "Imported Skills",
        bullets: skillNames,
      });
    }
  }

  // 4. Parse Profile.csv (Personal Details & Summary)
  const profileFile = Object.values(zip.files).find((f) =>
    /profile\.csv$/i.test(f.name)
  );
  if (profileFile) {
    const content = await profileFile.async("string");
    const rows = parseCsv(content);
    if (rows[0]) {
      const p = rows[0];
      const fullName = [p["First Name"] || "", p["Last Name"] || ""].filter(Boolean).join(" ").trim();
      const headline = (p["Headline"] || "").trim();
      const summary = (p["Summary"] || "").trim();
      const location = (p["Geo Location"] || p["Address"] || "").trim();

      if (fullName || headline || location) {
        const bullets = [
          headline ? `Headline: ${headline}` : "",
        ].filter(Boolean);
        items.push({
          entryType: "profile",
          title: "Personal Details",
          organization: fullName || undefined,
          location: location || undefined,
          descriptionContext: headline || undefined,
          bullets: bullets.length > 0 ? bullets : [fullName || location],
        });
      }
      if (summary && summary.length > 20) {
        items.push({
          entryType: "profile",
          title: "Professional Summary",
          descriptionContext: summary,
          bullets: [summary],
        });
      }
    }
  }

  // 5. Parse Projects.csv
  const projectsFile = Object.values(zip.files).find((f) =>
    /projects\.csv$/i.test(f.name)
  );
  if (projectsFile) {
    const content = await projectsFile.async("string");
    const rows = parseCsv(content);
    for (const r of rows) {
      const title = (r["Title"] || "").trim();
      if (!title) continue;
      const desc = (r["Description"] || "").trim();
      const url = (r["Url"] || "").trim();
      const startDate = (r["Started On"] || "").trim() || undefined;
      const endDate = (r["Finished On"] || "").trim() || undefined;
      const bullets = desc
        ? desc.split(/\r?\n|•/).map((b) => b.trim()).filter((b) => b.length > 5)
        : [title];
      if (url) bullets.push(`Link: ${url}`);
      items.push({
        entryType: "project",
        title,
        startDate,
        endDate,
        descriptionContext: url || undefined,
        bullets,
      });
    }
  }

  // 6. Parse Certifications.csv
  const certsFile = Object.values(zip.files).find((f) =>
    /certifications\.csv$/i.test(f.name)
  );
  if (certsFile) {
    const content = await certsFile.async("string");
    const rows = parseCsv(content);
    for (const r of rows) {
      const name = (r["Name"] || "").trim();
      if (!name) continue;
      const authority = (r["Authority"] || "").trim() || undefined;
      const startDate = (r["Started On"] || "").trim() || undefined;
      const endDate = (r["Finished On"] || "").trim() || undefined;
      items.push({
        entryType: "certification",
        title: name,
        organization: authority,
        startDate,
        endDate,
        bullets: [authority ? `${name} — ${authority}` : name],
      });
    }
  }

  // 7. Parse Honors.csv
  const honorsFile = Object.values(zip.files).find((f) =>
    /honors\.csv$/i.test(f.name)
  );
  if (honorsFile) {
    const content = await honorsFile.async("string");
    const rows = parseCsv(content);
    for (const r of rows) {
      const title = (r["Title"] || "").trim();
      if (!title) continue;
      const desc = (r["Description"] || "").trim();
      const issuedOn = (r["Issued On"] || "").trim() || undefined;
      items.push({
        entryType: "award",
        title,
        endDate: issuedOn,
        bullets: desc ? [title, desc] : [title],
      });
    }
  }

  // 8. Parse Languages.csv
  const langsFile = Object.values(zip.files).find((f) =>
    /languages\.csv$/i.test(f.name)
  );
  if (langsFile) {
    const content = await langsFile.async("string");
    const rows = parseCsv(content);
    const langs = rows
      .map((r) => {
        const name = (r["Name"] || "").trim();
        const prof = (r["Proficiency"] || "").trim();
        return name ? (prof ? `${name} (${prof})` : name) : "";
      })
      .filter(Boolean);
    if (langs.length > 0) {
      items.push({
        entryType: "skill_group",
        title: "Languages (Spoken)",
        bullets: langs,
      });
    }
  }

  return { items, fileList };
}
