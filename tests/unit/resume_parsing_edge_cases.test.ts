import { describe, it, expect, vi, afterEach } from "vitest";
import JSZip from "jszip";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";
import { parseDocxBuffer } from "@/lib/parsers/browserDocxParser";
import { parseLinkedInZip } from "@/lib/parsers/browserZipParser";
import { ResumeStructuringService } from "@/lib/parsers/resumeStructuringService";
import { AiResumeParserService } from "@/lib/ai/services/aiResumeParserService";

/**
 * Helper to construct a minimal multi-page PDF with exact positioning and optional link annotations
 * so PDF layout/column/multi-page edge cases are tested deterministically.
 */
function buildSyntheticPdf(
  pagesSpec: Array<{
    streams: string[];
    links?: Array<{ rect: [number, number, number, number]; uri: string }>;
  }>
): Uint8Array {
  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length; // 1-based PDF object number
  };

  const catalogId = addObj("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObj("<< /Type /Pages /Kids [] /Count 0 >>");
  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageIds: number[] = [];

  for (const page of pagesSpec) {
    const contentBody = page.streams.join("\n");
    const contentId = addObj(`<< /Length ${contentBody.length} >>\nstream\n${contentBody}\nendstream`);

    const annotIds: number[] = [];
    for (const link of page.links || []) {
      const aId = addObj(
        `<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${link.uri}) >> >>`
      );
      annotIds.push(aId);
    }

    const annotsEntry = annotIds.length > 0 ? `/Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]` : "";
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R ${annotsEntry} >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

describe("Comprehensive Resume Parsing Edge Cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Spatial PDF Layout, Columns, Kerning & Multi-Page Chrome", () => {
    it("unscrambles two-column PDF layouts without interleaving left and right columns", async () => {
      // Interleave left sidebar (x=40) and right main column (x=280) at identical Y coordinates
      const streams = [
        "BT /F1 14 Tf 40 750 Td (MAYA PATEL) Tj ET",
        "BT /F1 10 Tf 40 732 Td (maya@example.com | +91 9820112233 | Bengaluru, India) Tj ET",
        // Left column (x=40) & Right column (x=260) sharing Y coordinates
        "BT /F1 10 Tf 40 690 Td (SKILLS) Tj ET",
        "BT /F1 10 Tf 260 690 Td (EXPERIENCE) Tj ET",
        "BT /F1 9 Tf 40 672 Td (Python, TypeScript, Go) Tj ET",
        "BT /F1 9 Tf 260 672 Td (Senior Backend Engineer - CloudScale Inc) Tj ET",
        "BT /F1 9 Tf 40 654 Td (PostgreSQL, Redis, Docker) Tj ET",
        "BT /F1 9 Tf 260 654 Td (Jan 2022 - Present) Tj ET",
        "BT /F1 9 Tf 40 636 Td (Kubernetes, Terraform, AWS) Tj ET",
        "BT /F1 9 Tf 260 636 Td (- Architected event-driven billing services) Tj ET",
        "BT /F1 10 Tf 40 600 Td (EDUCATION) Tj ET",
        "BT /F1 9 Tf 260 600 Td (handling 50k RPS across multi-region clusters.) Tj ET",
        "BT /F1 9 Tf 40 582 Td (B.Tech in Computer Science) Tj ET",
        "BT /F1 9 Tf 260 582 Td (- Reduced query p99 latency by 42%.) Tj ET",
        "BT /F1 9 Tf 40 564 Td (NIT Surathkal | 2018 - 2022) Tj ET",
        "BT /F1 9 Tf 260 564 Td (- Mentored 5 engineers on distributed tracing.) Tj ET",
      ];

      const pdfBytes = buildSyntheticPdf([{ streams }]);
      const parsed = await parsePdfBuffer(pdfBytes, "two_col.pdf");

      // Columns should be emitted sequentially, NOT merged side-by-side on same lines
      expect(parsed.text).not.toContain("SKILLS EXPERIENCE");
      expect(parsed.text).not.toContain("Python, TypeScript, Go Senior Backend Engineer");

      const sections = ResumeStructuringService.structureResumeText(parsed.text, "two_col.pdf");
      const exp = sections.find((s) => s.entryType === "experience");
      expect(exp).toBeDefined();
      expect(exp!.title).toContain("Senior Backend Engineer");
      expect(exp!.organization).toContain("CloudScale Inc");
      expect(exp!.bullets.some((b) => b.includes("50k RPS"))).toBe(true);

      const edu = sections.find((s) => s.entryType === "education");
      expect(edu).toBeDefined();
      expect(edu!.organization).toContain("NIT Surathkal");
    }, 30000);

    it("joins touching glyph runs without mid-word spaces and extracts PDF hyperlink annotations", async () => {
      // Simulate split glyphs inside "Engineering" and clickable "GitHub" annotation
      const streams = [
        "BT /F1 12 Tf 40 740 Td (ARJUN VERMA) Tj ET",
        "BT /F1 10 Tf 40 720 Td (arjun@example.com | GitHub) Tj ET",
        "BT /F1 10 Tf 40 690 Td (B.Tech in Computer ) Tj 1 0 0 1 130 690 Tm (Engi) Tj 1 0 0 1 148 690 Tm (neering) Tj ET",
      ];

      const pdfBytes = buildSyntheticPdf([
        {
          streams,
          links: [{ rect: [130, 715, 175, 730], uri: "https://github.com/arjun-verma" }],
        },
      ]);

      const parsed = await parsePdfBuffer(pdfBytes, "links_kerning.pdf");
      expect(parsed.text).toContain("Engineering");
      expect(parsed.text).not.toContain("Engi neering");
      expect(parsed.text).toContain("https://github.com/arjun-verma");
    }, 30000);

    it("strips repeated page headers and page numbers across multi-page PDFs", async () => {
      const page1Streams = [
        "BT /F1 11 Tf 40 760 Td (JANE DOE | jane.doe@example.com | 9876543210) Tj ET",
        "BT /F1 10 Tf 40 720 Td (EXPERIENCE) Tj ET",
        "BT /F1 10 Tf 40 700 Td (Staff Engineer - Acme Corp | 2020 - Present) Tj ET",
        "BT /F1 10 Tf 40 680 Td (- Led distributed storage engine migration across 12 services) Tj ET",
        "BT /F1 9 Tf 280 30 Td (Page 1 of 2) Tj ET",
      ];
      const page2Streams = [
        "BT /F1 11 Tf 40 760 Td (JANE DOE | jane.doe@example.com | 9876543210) Tj ET",
        "BT /F1 10 Tf 40 720 Td (supporting 10M daily active users.) Tj ET",
        "BT /F1 10 Tf 40 690 Td (PROJECTS) Tj ET",
        "BT /F1 10 Tf 40 670 Td (FastKV - Embedded Storage Engine) Tj ET",
        "BT /F1 10 Tf 40 650 Td (- Built crash-safe LSM storage in Rust.) Tj ET",
        "BT /F1 9 Tf 280 30 Td (Page 2 of 2) Tj ET",
      ];

      const pdfBytes = buildSyntheticPdf([{ streams: page1Streams }, { streams: page2Streams }]);
      const parsed = await parsePdfBuffer(pdfBytes, "multipage.pdf");

      expect(parsed.pageCount).toBe(2);
      expect(parsed.text).not.toContain("Page 1 of 2");
      expect(parsed.text).not.toContain("Page 2 of 2");
      // Page 2 should NOT contain repeated contact header line
      expect(parsed.pages[1]).not.toContain("jane.doe@example.com");

      const sections = ResumeStructuringService.structureResumeText(parsed.text, "multipage.pdf");
      const exp = sections.find((s) => s.entryType === "experience");
      expect(exp).toBeDefined();
      expect(exp!.bullets[0]).toContain("10M daily active users");
    }, 30000);
  });

  describe("2. DOCX Header XML, Links & Extended LinkedIn ZIP Support", () => {
    it("extracts Word header1.xml contact info alongside body paragraphs", async () => {
      const docx = new JSZip();
      docx.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
      );
      docx.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
      );
      docx.file(
        "word/header1.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>PRIYA NAIR | priya.nair@example.com | +91 9811223344</w:t></w:r></w:p></w:hdr>`
      );
      docx.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>EXPERIENCE</w:t></w:r></w:p><w:p><w:r><w:t>Backend Engineer — FinStack | 2023 - Present</w:t></w:r></w:p><w:p><w:r><w:t>• Built ledger reconciliation APIs.</w:t></w:r></w:p></w:body></w:document>`
      );

      const bytes = await docx.generateAsync({ type: "uint8array" });
      const parsed = await parseDocxBuffer(bytes, "header_resume.docx");

      expect(parsed.text).toContain("PRIYA NAIR");
      expect(parsed.text).toContain("priya.nair@example.com");

      const sections = ResumeStructuringService.structureResumeText(parsed.text, "header_resume.docx");
      const personal = sections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personal).toBeDefined();
      expect(personal!.organization).toBe("PRIYA NAIR");
    });

    it("extracts Profile, Projects, Certifications, Honors, and Languages from LinkedIn ZIP exports", async () => {
      const zip = new JSZip();
      zip.file(
        "Profile.csv",
        `"First Name","Last Name","Headline","Summary","Geo Location"\n"Rohan","Kulkarni","Full-Stack Engineer","Building resilient distributed applications.","Pune, India"`
      );
      zip.file(
        "Projects.csv",
        `"Title","Description","Url","Started On","Finished On"\n"QueryPulse","Real-time Postgres query analyzer","https://github.com/rohan/querypulse","Jan 2024","May 2024"`
      );
      zip.file(
        "Certifications.csv",
        `"Name","Authority","Started On","Finished On"\n"AWS Certified Developer","Amazon Web Services","Jan 2024",""`
      );
      zip.file(
        "Honors.csv",
        `"Title","Description","Issued On"\n"SIH Winner","Won National Hackathon","Dec 2024"`
      );
      zip.file(
        "Languages.csv",
        `"Name","Proficiency"\n"English","Native or bilingual proficiency"\n"Marathi","Native"`
      );

      const zipBuf = await zip.generateAsync({ type: "uint8array" });
      const parsed = await parseLinkedInZip(zipBuf);

      expect(parsed.items.some((i) => i.entryType === "profile" && i.title === "Personal Details")).toBe(true);
      expect(parsed.items.some((i) => i.entryType === "profile" && i.title === "Professional Summary")).toBe(true);
      expect(parsed.items.some((i) => i.entryType === "project" && i.title === "QueryPulse")).toBe(true);
      expect(parsed.items.some((i) => i.entryType === "certification" && i.title === "AWS Certified Developer")).toBe(true);
      expect(parsed.items.some((i) => i.entryType === "award" && i.title === "SIH Winner")).toBe(true);
      expect(parsed.items.some((i) => i.entryType === "skill_group" && i.title === "Languages (Spoken)")).toBe(true);
    });
  });

  describe("3. Real-World Messy Formatting & Edge Cases in ResumeStructuringService", () => {
    it("handles spaced ALL-CAPS headers, spaced emails/URLs, Company-first headers, and Education metadata", () => {
      const messyText = `
ROHAN MEHTA
rohan . mehta @ gmail . com | +91 98200 11223 | https : // github . com / rohan - mehta | https://rohanmehta.dev

C A R E E R   O B J E C T I V E
Final year CS student focused on distributed backend systems and cloud security.

E X P E R I E N C E
Stripe — Software Engineering Intern | Remote | May 2025 - Ongoing
• Engineered idempotency middleware reducing duplicate webhook retries by 38%.
• Automated schema migration checks in CI/CD pipelines.

Google — Associate Cloud Engineer
Jan 2024 - Dec 2024
Bengaluru, India
Built multi-region IAM audit scripts in Python.

E D U C A T I O N
B.Tech in Computer Science & Engineering
Indian Institute of Technology, Bombay
2022 - 2026
CGPA: 9.42 / 10.0
Relevant Coursework: Operating Systems, Distributed Systems, Computer Networks
• Dean's Merit List 2024

P R O J E C T S
VectorCache | Rust, Redis | Jan 2025 - Mar 2025
• Implemented lock-free LRU cache with 120k ops/sec throughput.
Implemented snapshot persistence to disk.

S K I L L S
Cloud (AWS, GCP, Azure), Python (NumPy, Pandas), CI/CD, UI/UX, Docker, PostgreSQL, TypeScript, React, RAG, TensorFlow

C E R T I F I C A T I O N S
AWS Certified Solutions Architect, Amazon Web Services (2024)
CKAD: Certified Kubernetes Application Developer — Linux Foundation (2025)
      `.trim();

      const sections = ResumeStructuringService.structureResumeText(messyText, "EdgeCase.txt");

      // Personal details: spaced email, spaced URL, bare .dev portfolio, spaced phone
      const personal = sections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personal).toBeDefined();
      expect(personal!.organization).toBe("ROHAN MEHTA");
      expect(personal!.bullets.some((b) => b.includes("rohan.mehta@gmail.com"))).toBe(true);
      expect(personal!.bullets.some((b) => b.includes("github.com/rohan-mehta"))).toBe(true);
      expect(personal!.bullets.some((b) => b.includes("rohanmehta.dev"))).toBe(true);

      // Career Objective -> Professional Summary
      const summary = sections.find((s) => s.entryType === "profile" && s.title === "Professional Summary");
      expect(summary).toBeDefined();
      expect(summary!.descriptionContext).toContain("distributed backend systems");

      // Company-first headers swapped cleanly into Role + Organization + Location + Ongoing
      const exps = sections.filter((s) => s.entryType === "experience");
      expect(exps.length).toBe(2);
      expect(exps[0].title).toBe("Software Engineering Intern");
      expect(exps[0].organization).toBe("Stripe");
      expect(exps[0].location).toBe("Remote");
      expect(exps[0].isCurrent).toBe(true);
      expect(exps[0].endDate).toBeNull();

      expect(exps[1].title).toBe("Associate Cloud Engineer");
      expect(exps[1].organization).toBe("Google");
      expect(exps[1].location).toBe("Bengaluru, India");
      expect(exps[1].startDate).toBe("Jan 2024");
      expect(exps[1].endDate).toBe("Dec 2024");

      // Education metadata (CGPA, Coursework, Honors) stays inside 1 Education card (no phantom entries!)
      const edus = sections.filter((s) => s.entryType === "education");
      expect(edus.length).toBe(1);
      expect(edus[0].title).toContain("B.Tech");
      expect(edus[0].bullets.some((b) => b.includes("CGPA: 9.42"))).toBe(true);
      expect(edus[0].bullets.some((b) => b.includes("Relevant Coursework"))).toBe(true);
      expect(edus[0].bullets.some((b) => b.includes("Dean's Merit List"))).toBe(true);

      // Projects: 1 project card; action sentence NOT turned into a 2nd project!
      const projects = sections.filter((s) => s.entryType === "project");
      expect(projects.length).toBe(1);
      expect(projects[0].title).toBe("VectorCache");
      expect(projects[0].descriptionContext).toContain("Rust");
      expect(projects[0].bullets.some((b) => b.includes("Implemented snapshot persistence"))).toBe(true);

      // Skills: Parentheses preserved cleanly and large flat dump organized cleanly
      const skillGroups = sections.filter((s) => s.entryType === "skill_group");
      const allSkills = skillGroups.flatMap((g) => g.bullets);
      expect(allSkills).toContain("Cloud (AWS, GCP, Azure)");
      expect(allSkills).toContain("Python (NumPy, Pandas)");
      expect(allSkills).toContain("CI/CD");
      expect(allSkills).toContain("UI/UX");
      expect(skillGroups.length).toBeGreaterThanOrEqual(2);

      // Certifications: issuer ", Amazon Web Services (2024)" not split into a separate cert!
      const certs = sections.filter((s) => s.entryType === "certification");
      expect(certs.length).toBe(2);
      expect(certs[0].organization).toContain("Amazon Web Services");
      expect(certs[0].endDate).toBe("2024");
      expect(certs[1].organization).toContain("Linux Foundation");
      expect(certs[1].endDate).toBe("2025");
    });
  });

  describe("4. Hybrid AI Parser (AiResumeParserService) Cleanup & Safety Net", () => {
    it("emits Personal Details, preserves skillGroups, strips summary contact leaks, and supplements missed sections", async () => {
      const rawText = `
ALEXANDER WANG
San Francisco, CA | alex@example.com | +1 415 555 0199

EDUCATION
B.S. in Computer Science
UC Berkeley
2016 - 2020
      `.trim();

      const mockLlmPayload = {
        name: "ALEXANDER WANG",
        contact: {
          email: "alex@example.com",
          phone: "+1 415 555 0199",
          location: "San Francisco, CA",
          links: ["https://github.com/alexwang"],
        },
        // Simulate LLM leaking email into summary and omitting education completely
        summary: "Systems engineer. Contact me at alex@example.com or +1 415 555 0199.",
        education: [],
        experience: [
          {
            role: "Staff Engineer",
            organization: "Acme",
            startDate: "2021",
            endDate: "Present",
            isCurrent: true,
            bullets: ["• Built streaming pipeline."],
          },
        ],
        skillGroups: [
          { category: "Languages", skills: ["Go", "Rust", "TypeScript"] },
          { category: "Cloud", skills: ["AWS", "Kubernetes"] },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(mockLlmPayload) } }],
            usage: { prompt_tokens: 100, completion_tokens: 150, total_tokens: 250 },
          }),
          { status: 200 }
        )
      );

      const res = await AiResumeParserService.parseFromText(rawText, "Hybrid.pdf", {
        apiKey: "sk-test-openrouter-key",
        model: "inclusionai/ling-3.2-flash:free",
      });

      const personal = res.structuredSections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personal).toBeDefined();
      expect(personal!.organization).toBe("ALEXANDER WANG");
      expect(personal!.bullets.some((b) => b.includes("alex@example.com"))).toBe(true);

      const summary = res.structuredSections.find((s) => s.entryType === "profile" && s.title === "Professional Summary");
      expect(summary).toBeDefined();
      expect(summary!.descriptionContext).not.toContain("alex@example.com");

      const skillGroups = res.structuredSections.filter((s) => s.entryType === "skill_group");
      expect(skillGroups.some((g) => g.title === "Languages" && g.bullets.includes("Rust"))).toBe(true);
      expect(skillGroups.some((g) => g.title === "Cloud" && g.bullets.includes("Kubernetes"))).toBe(true);

      // Education was omitted by LLM, so deterministic cross-check supplemented it!
      const edu = res.structuredSections.find((s) => s.entryType === "education");
      expect(edu).toBeDefined();
      expect(edu!.title).toContain("B.S.");
    });
  });
});
