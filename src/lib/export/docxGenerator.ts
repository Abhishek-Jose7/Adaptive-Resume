import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
} from "docx";
import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";
import { normalizeResumeForExport } from "./docNormalizer";

export class DocxGenerator {
  static async generate(doc: ResumeDoc): Promise<Blob> {
    return this.generateDocxBlob(doc);
  }

  /**
   * Generates a standard Microsoft Word .docx buffer from a ResumeDoc
   * Supports both top-level arrays and canonical doc.sections[], links, certifications, and page sizes.
   */
  static async generateDocxBlob(doc: ResumeDoc): Promise<Blob> {
    const normalized = normalizeResumeForExport(doc);
    const paragraphs: Paragraph[] = [];

    // Header: Name
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: normalized.candidateName.toUpperCase(),
            bold: true,
            size: 28, // 14pt
            font: "Calibri",
          }),
        ],
      })
    );

    // Headline
    if (normalized.headline) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: normalized.headline,
              italics: true,
              size: 22,
              font: "Calibri",
              color: "555555",
            }),
          ],
        })
      );
    }

    // Contact info & profile links
    const contactParts: string[] = [];
    if (normalized.email) contactParts.push(normalized.email);
    if (normalized.phone) contactParts.push(normalized.phone);
    if (normalized.location) contactParts.push(normalized.location);

    if (contactParts.length > 0) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: normalized.links.length > 0 ? 40 : 200 },
          children: [
            new TextRun({
              text: contactParts.join("  |  "),
              size: 19,
              font: "Calibri",
            }),
          ],
        })
      );
    }

    if (normalized.links.length > 0) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: normalized.links
                .map((l) => `${l.label ? `${l.label}: ` : ""}${l.url}`)
                .join("  |  "),
              size: 18,
              font: "Calibri",
              color: "2B4C7E",
            }),
          ],
        })
      );
    }

    const addSectionHeader = (title: string) => {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          heading: HeadingLevel.HEADING_2,
          border: {
            bottom: {
              color: "333333",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: "Calibri",
              color: "222222",
            }),
          ],
        })
      );
    };

    // Summary
    if (normalized.summary) {
      addSectionHeader("Professional Summary");
      paragraphs.push(
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: normalized.summary,
              size: 20,
              font: "Calibri",
            }),
          ],
        })
      );
    }

    const renderers: Record<string, () => void> = {
      experience: () => {
        if (normalized.experiences.length === 0) return;
        addSectionHeader("Professional Experience");
        for (const exp of normalized.experiences) {
          const dateRange = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || "Present"}`;
          paragraphs.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({ text: `${exp.position}`, bold: true, size: 21, font: "Calibri" }),
                new TextRun({
                  text: exp.company ? `  |  ${exp.company}` : "",
                  bold: false,
                  color: "444444",
                  size: 21,
                  font: "Calibri",
                }),
                new TextRun({ text: `\t${dateRange}`, italics: true, size: 19, font: "Calibri" }),
              ],
            })
          );
          for (const bullet of exp.bullets || []) {
            paragraphs.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 30 },
                children: [new TextRun({ text: bullet.text, size: 20, font: "Calibri" })],
              })
            );
          }
        }
      },
      education: () => {
        if (normalized.educations.length === 0) return;
        addSectionHeader("Education");
        for (const edu of normalized.educations) {
          paragraphs.push(
            new Paragraph({
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({ text: edu.degree || "Degree", bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: edu.field ? ` in ${edu.field}` : "", bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: `  -  ${edu.institution}`, bold: true, size: 20, font: "Calibri" }),
                new TextRun({
                  text: `\t${edu.startDate} - ${edu.endDate || "Present"}`,
                  italics: true,
                  size: 19,
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      },
      skills: () => {
        if (normalized.skills.length === 0) return;
        addSectionHeader("Skills");
        const grouped = getGroupedSkills(normalized.skills);
        const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
        if (hasCategories) {
          for (const g of grouped) {
            paragraphs.push(
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `${g.category}: `, bold: true, size: 20, font: "Calibri" }),
                  new TextRun({ text: g.items.join("  •  "), size: 20, font: "Calibri" }),
                ],
              })
            );
          }
        } else {
          paragraphs.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: normalized.skills.map((s) => s.name).join("  •  "),
                  size: 20,
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      },
      projects: () => {
        if (normalized.projects.length === 0) return;
        addSectionHeader("Key Projects");
        for (const proj of normalized.projects) {
          paragraphs.push(
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: proj.name, bold: true, size: 20, font: "Calibri" }),
                ...(proj.role
                  ? [new TextRun({ text: ` (${proj.role})`, bold: true, size: 20, font: "Calibri" })]
                  : []),
                ...(proj.url
                  ? [new TextRun({ text: `  —  ${proj.url}`, size: 18, color: "2B4C7E", font: "Calibri" })]
                  : []),
              ],
            })
          );
          if (proj.description) {
            const shortDesc = shortenProjectDescription(proj.description) || proj.description;
            paragraphs.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: shortDesc, size: 20, font: "Calibri" })],
              })
            );
          }
          for (const bullet of proj.bullets || []) {
            paragraphs.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 30 },
                children: [new TextRun({ text: bullet.text, size: 20, font: "Calibri" })],
              })
            );
          }
        }
      },
      certifications: () => {
        if (normalized.certifications.length === 0) return;
        addSectionHeader("Certifications & Credentials");
        for (const c of normalized.certifications) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 30 },
              children: [
                new TextRun({ text: c.name, bold: true, size: 20, font: "Calibri" }),
                ...(c.issuer
                  ? [new TextRun({ text: ` — ${c.issuer}`, size: 20, font: "Calibri", color: "444444" })]
                  : []),
                ...(c.issueDate
                  ? [new TextRun({ text: ` (${c.issueDate})`, italics: true, size: 19, font: "Calibri" })]
                  : []),
              ],
            })
          );
        }
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
        addSectionHeader(customSec.heading);
        for (const item of customSec.items) {
          paragraphs.push(
            new Paragraph({
              spacing: { before: 80, after: 30 },
              children: [
                new TextRun({ text: item.title || "", bold: true, size: 20, font: "Calibri" }),
                ...(item.organization
                  ? [new TextRun({ text: `  |  ${item.organization}`, size: 20, color: "444444", font: "Calibri" })]
                  : []),
              ],
            })
          );
          for (const b of item.bullets || []) {
            paragraphs.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 30 },
                children: [new TextRun({ text: b.text, size: 20, font: "Calibri" })],
              })
            );
          }
        }
      }
    }

    // Page dimensions in twentieths of a point (twips):
    // A4 = 210mm x 297mm -> 11906 x 16838 twips; LETTER = 8.5in x 11in -> 12240 x 15840 twips
    const pageSizeConfig =
      normalized.pageSize === "A4"
        ? { width: 11906, height: 16838 }
        : { width: 12240, height: 15840 };

    const wordDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: pageSizeConfig,
              margin: {
                top: 720, // 0.5 in
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBlob(wordDoc);
  }
}
