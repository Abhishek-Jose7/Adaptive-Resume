import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";
import { normalizeResumeForExport } from "./docNormalizer";

export class PlainTextSerializer {
  /**
   * Serializes a canonical ResumeDoc into clean, formatted plain text
   * Parity across top-level arrays and canonical doc.sections[], links, certifications, and sectionOrder.
   */
  static serialize(doc: ResumeDoc): string {
    const normalized = normalizeResumeForExport(doc);
    const lines: string[] = [];
    const candidateName = normalized.candidateName.toUpperCase();

    // 1. Header
    lines.push(candidateName);
    lines.push("=".repeat(candidateName.length));

    if (normalized.headline) {
      lines.push(normalized.headline);
    }

    const contactParts: string[] = [];
    if (normalized.email) contactParts.push(normalized.email);
    if (normalized.phone) contactParts.push(normalized.phone);
    if (normalized.location) contactParts.push(normalized.location);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(" | "));
    }

    if (normalized.links.length > 0) {
      lines.push(
        normalized.links
          .map((l) => (l.label ? `${l.label}: ${l.url}` : l.url))
          .join(" | ")
      );
    }

    lines.push("");

    // 2. Summary
    if (normalized.summary) {
      lines.push("PROFESSIONAL SUMMARY");
      lines.push("-".repeat(20));
      lines.push(normalized.summary);
      lines.push("");
    }

    const renderers: Record<string, () => void> = {
      experience: () => {
        if (normalized.experiences.length === 0) return;
        lines.push("PROFESSIONAL EXPERIENCE");
        lines.push("-".repeat(23));
        for (const exp of normalized.experiences) {
          const dates = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || "Present"}`;
          lines.push(`${exp.position} | ${exp.company} (${dates})`);
          if (exp.location) lines.push(`Location: ${exp.location}`);
          for (const bullet of exp.bullets || []) {
            lines.push(`  * ${bullet.text}`);
          }
          lines.push("");
        }
      },
      education: () => {
        if (normalized.educations.length === 0) return;
        lines.push("EDUCATION");
        lines.push("-".repeat(9));
        for (const edu of normalized.educations) {
          const degree = edu.degree ? `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}` : "Degree";
          lines.push(`${degree} - ${edu.institution} (${edu.startDate} - ${edu.endDate || "Present"})`);
        }
        lines.push("");
      },
      skills: () => {
        if (normalized.skills.length === 0) return;
        lines.push("TECHNICAL & PROFESSIONAL SKILLS");
        lines.push("-".repeat(31));
        const grouped = getGroupedSkills(normalized.skills);
        const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
        if (hasCategories) {
          for (const g of grouped) {
            lines.push(g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", "));
          }
        } else {
          lines.push(normalized.skills.map((s) => s.name).join(", "));
        }
        lines.push("");
      },
      projects: () => {
        if (normalized.projects.length === 0) return;
        lines.push("KEY PROJECTS");
        lines.push("-".repeat(12));
        for (const proj of normalized.projects) {
          lines.push(`${proj.name}${proj.role ? ` (${proj.role})` : ""}${proj.url ? ` - ${proj.url}` : ""}`);
          if (proj.description) {
            const shortDesc = shortenProjectDescription(proj.description) || proj.description;
            lines.push(`  ${shortDesc}`);
          }
          for (const b of proj.bullets || []) {
            lines.push(`  * ${b.text}`);
          }
          lines.push("");
        }
      },
      certifications: () => {
        if (normalized.certifications.length === 0) return;
        lines.push("CERTIFICATIONS");
        lines.push("-".repeat(14));
        for (const c of normalized.certifications) {
          lines.push(`* ${c.name}${c.issuer ? ` - ${c.issuer}` : ""}${c.issueDate ? ` (${c.issueDate})` : ""}`);
        }
        lines.push("");
      },
    };

    const rendered = new Set<string>();
    for (const sectionType of normalized.orderedSectionTypes) {
      if (rendered.has(sectionType)) continue;
      rendered.add(sectionType);

      if (renderers[sectionType]) {
        renderers[sectionType]();
        continue;
      }

      const customSec = normalized.extraSections.find((s) => s.type === sectionType);
      if (customSec && customSec.items.length > 0) {
        const heading = customSec.heading.toUpperCase();
        lines.push(heading);
        lines.push("-".repeat(heading.length));
        for (const item of customSec.items) {
          lines.push(`${item.title || ""}${item.organization ? ` | ${item.organization}` : ""}`);
          for (const b of item.bullets || []) {
            lines.push(`  * ${b.text}`);
          }
          lines.push("");
        }
      }
    }

    return lines.join("\n").trim();
  }
}
