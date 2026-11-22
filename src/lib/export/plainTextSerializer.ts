import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription } from "@/lib/utils/projectUtils";

export class PlainTextSerializer {
  /**
   * Serializes a canonical ResumeDoc into clean, formatted plain text
   * PRD Section 10.6 & 13.3
   */
  static serialize(doc: ResumeDoc): string {
    const lines: string[] = [];
    const candidateName = (doc.profile.fullName || doc.profile.name || "RESUME").toUpperCase();

    // 1. Header
    lines.push(candidateName);
    lines.push("=".repeat(candidateName.length));

    if (doc.profile.headline) {
      lines.push(doc.profile.headline);
    }

    const contactParts: string[] = [];
    if (doc.profile.email) contactParts.push(doc.profile.email);
    if (doc.profile.phone) contactParts.push(doc.profile.phone);
    if (doc.profile.location) contactParts.push(doc.profile.location);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(" | "));
    }

    if (doc.profile.links && doc.profile.links.length > 0) {
      lines.push(doc.profile.links.map((l) => `${l.label}: ${l.url}`).join(" | "));
    }

    lines.push("");

    // 2. Summary
    if (doc.profile.summary) {
      lines.push("PROFESSIONAL SUMMARY");
      lines.push("-".repeat(20));
      lines.push(doc.profile.summary);
      lines.push("");
    }

    // 3. Experience
    const experiences = doc.experience || [];
    if (experiences.length > 0) {
      lines.push("PROFESSIONAL EXPERIENCE");
      lines.push("-".repeat(23));

      for (const exp of experiences) {
        const dates = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || "Present"}`;
        lines.push(`${exp.position} | ${exp.company} (${dates})`);
        if (exp.location) lines.push(`Location: ${exp.location}`);

        for (const bullet of exp.bullets) {
          lines.push(`  * ${bullet.text}`);
        }
        lines.push("");
      }
    }

    // 4. Education
    const educations = doc.education || [];
    if (educations.length > 0) {
      lines.push("EDUCATION");
      lines.push("-".repeat(9));

      for (const edu of educations) {
        const degree = edu.degree ? `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}` : "Degree";
        lines.push(`${degree} - ${edu.institution} (${edu.startDate} - ${edu.endDate || "Present"})`);
      }
      lines.push("");
    }

    // 5. Skills
    const skills = doc.skills || [];
    if (skills.length > 0) {
      lines.push("TECHNICAL & PROFESSIONAL SKILLS");
      lines.push("-".repeat(31));
      lines.push(skills.map((s) => s.name).join(", "));
      lines.push("");
    }

    // 6. Projects
    const projects = doc.projects || [];
    if (projects.length > 0) {
      lines.push("KEY PROJECTS");
      lines.push("-".repeat(12));

      for (const proj of projects) {
        lines.push(`${proj.name}${proj.role ? ` (${proj.role})` : ""}${proj.url ? ` - ${proj.url}` : ""}`);
        if (proj.description) {
          const shortDesc = shortenProjectDescription(proj.description) || proj.description;
          lines.push(`  ${shortDesc}`);
        }
        for (const b of proj.bullets) {
          lines.push(`  * ${b.text}`);
        }
        lines.push("");
      }
    }

    // 7. Certifications
    const certs = doc.certifications || [];
    if (certs.length > 0) {
      lines.push("CERTIFICATIONS");
      lines.push("-".repeat(14));
      for (const c of certs) {
        lines.push(`* ${c.name} - ${c.issuer}${c.issueDate ? ` (${c.issueDate})` : ""}`);
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }
}
