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

export class DocxGenerator {
  static async generate(doc: ResumeDoc): Promise<Blob> {
    return this.generateDocxBlob(doc);
  }

  /**
   * Generates a standard Microsoft Word .docx buffer from a ResumeDoc
   * PRD Section 10.6 & 13.2
   */
  static async generateDocxBlob(doc: ResumeDoc): Promise<Blob> {
    const candidateName = doc.profile.fullName || doc.profile.name || "Resume";
    const paragraphs: Paragraph[] = [];

    // Header: Name
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: candidateName.toUpperCase(),
            bold: true,
            size: 28, // 14pt
            font: "Calibri",
          }),
        ],
      })
    );

    // Headline
    if (doc.profile.headline) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: doc.profile.headline,
              italics: true,
              size: 22,
              font: "Calibri",
              color: "555555",
            }),
          ],
        })
      );
    }

    // Contact info line
    const contactParts: string[] = [];
    if (doc.profile.email) contactParts.push(doc.profile.email);
    if (doc.profile.phone) contactParts.push(doc.profile.phone);
    if (doc.profile.location) contactParts.push(doc.profile.location);

    if (contactParts.length > 0) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
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

    // Helper for Section Heading
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
    if (doc.profile.summary) {
      addSectionHeader("Professional Summary");
      paragraphs.push(
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: doc.profile.summary,
              size: 20,
              font: "Calibri",
            }),
          ],
        })
      );
    }

    // Experience
    const experiences = doc.experience || [];
    if (experiences.length > 0) {
      addSectionHeader("Professional Experience");

      for (const exp of experiences) {
        const dateRange = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || "Present"}`;

        paragraphs.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: `${exp.position}`,
                bold: true,
                size: 21,
                font: "Calibri",
              }),
              new TextRun({
                text: `  |  ${exp.company}`,
                bold: false,
                color: "444444",
                size: 21,
                font: "Calibri",
              }),
              new TextRun({
                text: `\t${dateRange}`,
                italics: true,
                size: 19,
                font: "Calibri",
              }),
            ],
          })
        );

        for (const bullet of exp.bullets) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 30 },
              children: [
                new TextRun({
                  text: bullet.text,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      }
    }

    // Education
    const educations = doc.education || [];
    if (educations.length > 0) {
      addSectionHeader("Education");

      for (const edu of educations) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: edu.degree || "Degree",
                bold: true,
                size: 20,
                font: "Calibri",
              }),
              new TextRun({
                text: edu.field ? ` in ${edu.field}` : "",
                bold: true,
                size: 20,
                font: "Calibri",
              }),
              new TextRun({
                text: `  -  ${edu.institution}`,
                bold: true,
                size: 20,
                font: "Calibri",
              }),
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
    }

    // Skills
    const skills = doc.skills || [];
    if (skills.length > 0) {
      addSectionHeader("Skills");
      const grouped = getGroupedSkills(skills);
      const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));

      if (hasCategories) {
        for (const g of grouped) {
          paragraphs.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: `${g.category}: `,
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
                new TextRun({
                  text: g.items.join("  •  "),
                  size: 20,
                  font: "Calibri",
                }),
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
                text: skills.map((s) => s.name).join("  •  "),
                size: 20,
                font: "Calibri",
              }),
            ],
          })
        );
      }
    }

    // Projects
    const projects = doc.projects || [];
    if (projects.length > 0) {
      addSectionHeader("Key Projects");
      for (const proj of projects) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: proj.name,
                bold: true,
                size: 20,
                font: "Calibri",
              }),
              ...(proj.role
                ? [
                    new TextRun({
                      text: ` (${proj.role})`,
                      bold: true,
                      size: 20,
                      font: "Calibri",
                    }),
                  ]
                : []),
            ],
          })
        );

        if (proj.description) {
          const shortDesc = shortenProjectDescription(proj.description) || proj.description;
          paragraphs.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: shortDesc,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            })
          );
        }

        for (const bullet of proj.bullets) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 30 },
              children: [
                new TextRun({
                  text: bullet.text,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      }
    }

    const wordDoc = new Document({
      sections: [
        {
          properties: {
            page: {
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
