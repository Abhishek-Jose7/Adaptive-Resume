import { jsPDF } from "jspdf";
import { ResumeDoc } from "@/types/resume";
import { formatResumeDate } from "@/lib/editor/onePageA4Budgeter";
import { normalizeResumeForExport } from "@/lib/export/docNormalizer";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";
import { normalizeDistinctAwardIssuer } from "@/lib/tailoring/projectAngleSelector";

function sanitizeFilenamePart(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Formats the downloaded PDF filename as `<UserFirstName>_<JobTitle>.pdf`
 * (e.g. `Abhishek_AI_Engineer_Agent_Development.pdf`).
 */
export function buildResumePdfFilename(
  doc: ResumeDoc,
  options?: { resumeTitle?: string; fallbackFirstName?: string }
): string {
  const fullName = (
    options?.fallbackFirstName ||
    doc.profile?.fullName ||
    doc.profile?.name ||
    "Candidate"
  ).trim();
  const firstName = sanitizeFilenamePart(fullName.split(/\s+/)[0] || "Candidate") || "Candidate";

  const rawJobTitle = (options?.resumeTitle || doc.profile?.headline || "Resume")
    .replace(/\s+resume$/i, "")
    .trim();
  const jobTitleSlug = sanitizeFilenamePart(rawJobTitle) || "Resume";

  return `${firstName}_${jobTitleSlug}.pdf`;
}

function isPipeTechLine(text: string): boolean {
  const trimmed = text.trim();
  return Boolean(trimmed) && trimmed.includes("|") && trimmed.length <= 140 && !/[.!?]\s+[A-Z]/.test(trimmed);
}

/**
 * Renders a crisp, single-page vector ATS-friendly PDF (A4 or Letter) directly from `ResumeDoc`
 * and triggers an immediate file download in the browser without opening a print dialog.
 */
export function generateResumePdfBlob(
  doc: ResumeDoc,
  _options?: { resumeTitle?: string }
): Blob {
  const normalized = normalizeResumeForExport(doc);
  const isA4 = normalized.pageSize !== "LETTER";
  const pageWidthPt = isA4 ? 595.28 : 612;
  const pageHeightPt = isA4 ? 841.89 : 792;

  const headline = (normalized.headline || "").trim();
  const summary = (normalized.summary || "").trim();
  const showSummary = Boolean(summary) && summary.toLowerCase() !== headline.toLowerCase();

  // Attempt progressively tighter scale steps if content exceeds 1 page
  const presets = [
    { margin: 32, basePt: 9.6, lineGap: 1.24, secGap: 8, itemGap: 5 },
    { margin: 28, basePt: 9.0, lineGap: 1.2, secGap: 6.5, itemGap: 4 },
    { margin: 24, basePt: 8.5, lineGap: 1.15, secGap: 5.5, itemGap: 3.5 },
  ];

  let finalBlob: Blob | null = null;

  for (let pIdx = 0; pIdx < presets.length; pIdx++) {
    const preset = presets[pIdx];
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: isA4 ? "a4" : "letter",
    });

    const contentWidth = pageWidthPt - preset.margin * 2;
    let y = preset.margin + 12;
    let overflowed = false;

    const ensureSpace = (neededPt: number) => {
      if (y + neededPt > pageHeightPt - preset.margin) {
        overflowed = true;
        return false;
      }
      return true;
    };

    const drawSectionHeading = (label: string) => {
      y += preset.secGap;
      if (!ensureSpace(18)) return;
      pdf.setFont("times", "bold");
      pdf.setFontSize(preset.basePt);
      pdf.setTextColor(17, 24, 39);
      pdf.text(label.toUpperCase(), preset.margin, y);
      y += 3;
      pdf.setDrawColor(31, 41, 55);
      pdf.setLineWidth(0.75);
      pdf.line(preset.margin, y, pageWidthPt - preset.margin, y);
      y += preset.basePt * preset.lineGap;
    };

    const drawWrappedLines = (
      text: string,
      opts: { x: number; maxWidth: number; fontSize: number; bold?: boolean; italic?: boolean; bullet?: boolean }
    ) => {
      pdf.setFont("times", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
      pdf.setFontSize(opts.fontSize);
      const lines = pdf.splitTextToSize(text, opts.maxWidth) as string[];
      const lineStep = opts.fontSize * preset.lineGap;
      for (let i = 0; i < lines.length; i++) {
        if (!ensureSpace(lineStep)) break;
        if (opts.bullet && i === 0) {
          pdf.text("•", opts.x - 9, y);
        }
        pdf.text(lines[i], opts.x, y);
        y += lineStep;
      }
    };

    // Centered Header
    pdf.setFont("times", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(17, 24, 39);
    const nameStr = (normalized.candidateName || "Candidate").toUpperCase();
    pdf.text(nameStr, pageWidthPt / 2, y, { align: "center" });
    y += 14;

    if (headline) {
      pdf.setFont("times", "normal");
      pdf.setFontSize(preset.basePt);
      pdf.setTextColor(55, 65, 81);
      pdf.text(headline, pageWidthPt / 2, y, { align: "center" });
      y += 12;
    }

    const contactParts: string[] = [
      normalized.phone,
      normalized.email,
      normalized.location,
      ...(normalized.links || []).map((l) => l.label || l.url),
    ].filter((v): v is string => Boolean(v && v.trim()));

    if (contactParts.length > 0) {
      pdf.setFont("times", "normal");
      pdf.setFontSize(preset.basePt - 0.8);
      pdf.setTextColor(31, 41, 55);
      const contactLine = contactParts.join("  |  ");
      const wrappedContact = pdf.splitTextToSize(contactLine, contentWidth) as string[];
      for (const cLine of wrappedContact) {
        pdf.text(cLine, pageWidthPt / 2, y, { align: "center" });
        y += (preset.basePt - 0.5) * preset.lineGap;
      }
    }

    // Summary
    if (showSummary) {
      drawSectionHeading("Summary");
      drawWrappedLines(summary, {
        x: preset.margin,
        maxWidth: contentWidth,
        fontSize: preset.basePt - 0.4,
      });
    }

    // Experience
    if (normalized.experiences.length > 0) {
      drawSectionHeading("Experience");
      for (let eIdx = 0; eIdx < normalized.experiences.length; eIdx++) {
        const exp = normalized.experiences[eIdx];
        if (!ensureSpace(26)) break;
        const start = formatResumeDate(exp.startDate);
        const end = exp.isCurrent ? "Present" : formatResumeDate(exp.endDate) || "Present";
        const dateStr = start ? `${start} – ${end}` : end;

        pdf.setFont("times", "bold");
        pdf.setFontSize(preset.basePt - 0.1);
        pdf.setTextColor(17, 24, 39);
        pdf.text(exp.position || "", preset.margin, y);

        pdf.setFont("times", "normal");
        pdf.setFontSize(preset.basePt - 0.6);
        pdf.text(dateStr, pageWidthPt - preset.margin, y, { align: "right" });
        y += preset.basePt * preset.lineGap;

        if (exp.company || exp.location) {
          pdf.setFont("times", "italic");
          pdf.setFontSize(preset.basePt - 0.6);
          pdf.setTextColor(55, 65, 81);
          pdf.text(exp.company || "", preset.margin, y);
          if (exp.location) {
            pdf.text(exp.location, pageWidthPt - preset.margin, y, { align: "right" });
          }
          y += (preset.basePt - 0.4) * preset.lineGap;
        }

        pdf.setTextColor(31, 41, 55);
        for (const b of exp.bullets || []) {
          drawWrappedLines(b.text, {
            x: preset.margin + 12,
            maxWidth: contentWidth - 12,
            fontSize: preset.basePt - 0.6,
            bullet: true,
          });
        }
        if (eIdx < normalized.experiences.length - 1) y += preset.itemGap;
      }
    }

    // Projects
    if (normalized.projects.length > 0) {
      drawSectionHeading("Projects");
      for (let pI = 0; pI < normalized.projects.length; pI++) {
        const proj = normalized.projects[pI];
        if (!ensureSpace(24)) break;
        const firstBullet = proj.bullets?.[0]?.text || "";
        const hasStackBullet = isPipeTechLine(firstBullet);
        const stackLine = hasStackBullet
          ? firstBullet.replace(/\.$/, "")
          : shortenProjectDescription(proj.description) || proj.role || "";
        const displayBullets = hasStackBullet ? proj.bullets.slice(1) : proj.bullets || [];

        const titleText = stackLine ? `${proj.name} | ${stackLine}` : proj.name;
        drawWrappedLines(titleText, {
          x: preset.margin,
          maxWidth: contentWidth,
          fontSize: preset.basePt - 0.2,
          bold: true,
        });

        pdf.setTextColor(31, 41, 55);
        for (const b of displayBullets) {
          drawWrappedLines(b.text, {
            x: preset.margin + 12,
            maxWidth: contentWidth - 12,
            fontSize: preset.basePt - 0.6,
            bullet: true,
          });
        }
        if (pI < normalized.projects.length - 1) y += preset.itemGap;
      }
    }

    // Education
    if (normalized.educations.length > 0) {
      drawSectionHeading("Education");
      for (const edu of normalized.educations) {
        if (!ensureSpace(22)) break;
        const start = formatResumeDate(edu.startDate);
        const end = formatResumeDate(edu.endDate) || "Present";
        const dateRange = start ? `${start} – ${end}` : end;

        pdf.setFont("times", "bold");
        pdf.setFontSize(preset.basePt - 0.2);
        pdf.setTextColor(17, 24, 39);
        pdf.text(edu.institution || "", preset.margin, y);

        pdf.setFont("times", "normal");
        pdf.setFontSize(preset.basePt - 0.6);
        pdf.text(dateRange, pageWidthPt - preset.margin, y, { align: "right" });
        y += preset.basePt * preset.lineGap;

        const deg = `${edu.degree || "Degree"}${edu.field ? ` — ${edu.field}` : ""}`;
        pdf.setFont("times", "italic");
        pdf.setFontSize(preset.basePt - 0.6);
        pdf.setTextColor(31, 41, 55);
        pdf.text(deg, preset.margin, y);
        y += (preset.basePt - 0.2) * preset.lineGap;
      }
    }

    // Achievements & Certifications
    const awards = normalized.awards || [];
    const certs = normalized.certifications || [];
    if (awards.length > 0 || certs.length > 0) {
      drawSectionHeading("Achievements & Certifications");
      pdf.setTextColor(31, 41, 55);
      for (const a of awards) {
        const distinctIssuer = normalizeDistinctAwardIssuer(a.name, a.issuer);
        const label = `${a.name}${distinctIssuer ? `: ${distinctIssuer}` : ""}${a.issueDate ? ` (${formatResumeDate(a.issueDate)})` : ""}`;
        drawWrappedLines(label, {
          x: preset.margin + 12,
          maxWidth: contentWidth - 12,
          fontSize: preset.basePt - 0.6,
          bullet: true,
        });
      }
      for (const c of certs) {
        const label = `${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.issueDate ? ` (${formatResumeDate(c.issueDate)})` : ""}`;
        drawWrappedLines(label, {
          x: preset.margin + 12,
          maxWidth: contentWidth - 12,
          fontSize: preset.basePt - 0.6,
          bullet: true,
        });
      }
    }

    // Technical Skills
    if (normalized.skills.length > 0) {
      drawSectionHeading("Technical Skills");
      const grouped = getGroupedSkills(normalized.skills);
      const hasCategories =
        grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
      if (hasCategories) {
        for (const g of grouped) {
          const line = g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", ");
          drawWrappedLines(line, {
            x: preset.margin,
            maxWidth: contentWidth,
            fontSize: preset.basePt - 0.6,
          });
        }
      } else {
        drawWrappedLines(normalized.skills.map((s) => s.name).join(", "), {
          x: preset.margin,
          maxWidth: contentWidth,
          fontSize: preset.basePt - 0.6,
        });
      }
    }

    finalBlob = pdf.output("blob");
    if (!overflowed) break;
  }

  return finalBlob!;
}

/**
 * Generates the resume PDF client-side and immediately triggers a direct file download.
 */
export function downloadResumePdf(
  doc: ResumeDoc,
  options?: { resumeTitle?: string; fallbackFirstName?: string }
): string {
  const filename = buildResumePdfFilename(doc, options);
  const blob = generateResumePdfBlob(doc, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}
