import { describe, it, expect } from "vitest";
import { isPrivateOrReservedIp, validateJobPostingUrl, SsrfError } from "../../src/lib/security/ssrfProtection";
import { validateFileBuffer, MAX_FILE_SIZE_BYTES } from "../../src/lib/parsers/fileValidator";
import { JDAnalysisService } from "../../src/lib/services/jdAnalysisService";
import { JDAnalysisSchema } from "../../src/lib/validation/job";
import JSZip from "jszip";
import { parseLinkedInZip } from "../../src/lib/parsers/browserZipParser";

describe("Milestone M2: Intake, SSRF Protection & JD Analysis", () => {
  describe("SSRF Protection Engine", () => {
    it("should flag loopback, private, and link-local IP addresses as restricted", () => {
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.0.0.5")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.100")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true); // AWS/GCP metadata
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);

      // Public IP
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
    });

    it("should reject non-HTTPS URLs and local hostnames", async () => {
      await expect(validateJobPostingUrl("http://example.com/job")).rejects.toThrow(
        "Only secure HTTPS URLs are permitted"
      );
      await expect(validateJobPostingUrl("https://localhost:3000/job")).rejects.toThrow(
        "Access to local or internal network targets is prohibited"
      );
      await expect(validateJobPostingUrl("https://127.0.0.1/job")).rejects.toThrow(
        "Direct IP address connections are forbidden"
      );
    });
  });

  describe("File Validation & Magic Bytes", () => {
    it("should validate PDF files using magic bytes", () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // %PDF-1.5
      const res = validateFileBuffer(pdfBytes, "resume.pdf");
      expect(res.isValid).toBe(true);
      expect(res.fileType).toBe("pdf");
    });

    it("should validate DOCX and ZIP files using PK magic bytes", () => {
      const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]); // PK\x03\x04
      const docxRes = validateFileBuffer(zipBytes, "my_resume.docx");
      expect(docxRes.isValid).toBe(true);
      expect(docxRes.fileType).toBe("docx");

      const zipRes = validateFileBuffer(zipBytes, "linkedin_export.zip");
      expect(zipRes.isValid).toBe(true);
      expect(zipRes.fileType).toBe("zip");
    });

    it("should reject files exceeding 10 MB", () => {
      const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 10);
      oversized[0] = 0x25;
      oversized[1] = 0x50;
      oversized[2] = 0x44;
      oversized[3] = 0x46;

      const res = validateFileBuffer(oversized, "big.pdf");
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain("exceeds maximum allowable size of 10 MB");
    });

    it("should reject corrupted or unsupported files", () => {
      const invalid = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
      const res = validateFileBuffer(invalid, "unknown.bin");
      expect(res.isValid).toBe(false);
    });
  });

  describe("LinkedIn Export ZIP Parser", () => {
    it("should unzip and extract positions, education, and skills CSVs", async () => {
      const zip = new JSZip();

      const positionsCsv =
        `"Company Name","Title","Description","Location","Started On","Finished On"\n` +
        `"Acme Corp","Staff Systems Engineer","Engineered scalable cloud backend on AWS.\nOptimized database queries.","San Francisco, CA","Jan 2021","Present"`;

      const educationCsv =
        `"School Name","Degree Name","Notes","Start Date","End Date"\n` +
        `"MIT","B.S. Computer Science","GPA 3.9, Dean's List","2016","2020"`;

      const skillsCsv = `"Name"\n"TypeScript"\n"PostgreSQL"\n"Docker"`;

      zip.file("Positions.csv", positionsCsv);
      zip.file("Education.csv", educationCsv);
      zip.file("Skills.csv", skillsCsv);

      const zipBuffer = await zip.generateAsync({ type: "uint8array" });
      const parsed = await parseLinkedInZip(zipBuffer);

      console.log("Parsed LinkedIn items:", parsed.items.map(i => ({ type: i.entryType, title: i.title })));
      expect(parsed.items.length).toBe(3);

      const expItem = parsed.items.find((i) => i.entryType === "experience");
      expect(expItem).toBeDefined();
      expect(expItem!.title).toBe("Staff Systems Engineer");
      expect(expItem!.organization).toBe("Acme Corp");
      expect(expItem!.bullets.length).toBeGreaterThan(0);

      const eduItem = parsed.items.find((i) => i.entryType === "education");
      expect(eduItem).toBeDefined();
      expect(eduItem!.organization).toBe("MIT");

      const skillsItem = parsed.items.find((i) => i.entryType === "skill_group");
      expect(skillsItem).toBeDefined();
      expect(skillsItem!.bullets).toContain("TypeScript");
      expect(skillsItem!.bullets).toContain("PostgreSQL");
    });
  });

  describe("JD Analysis Engine (Appendix A Schema)", () => {
    it("should parse JD text into valid Appendix A schema with seniority, work mode, and keywords", () => {
      const sampleJd = `
        Senior Full Stack Engineer
        Acme Technologies - Remote (US)
        
        About the Role:
        We are seeking a Senior Full Stack Engineer with 5+ years of experience to join our core product team.
        
        Requirements:
        • 5+ years of experience building modern web applications
        • Proficiency in TypeScript, React, and Node.js
        • Strong database experience with PostgreSQL and SQL query optimization
        • Hands-on experience with Docker and AWS
        
        Responsibilities:
        • Architect and deploy scalable microservices
        • Build responsive web interfaces with Next.js and Tailwind CSS
        • Collaborate across engineering, product, and design teams
      `;

      const analysis = JDAnalysisService.analyzeDeterministic(sampleJd);
      const validated = JDAnalysisSchema.parse(analysis);

      expect(validated.schemaVersion).toBe(1);
      expect(validated.role.seniority).toBe("senior");
      expect(validated.role.workMode).toBe("remote");
      expect(validated.role.yearsExperience.min).toBe(5);

      const keywords = validated.keywords.map((k) => k.canonical);
      expect(keywords).toContain("TypeScript");
      expect(keywords).toContain("React");
      expect(keywords).toContain("Node.js");
      expect(keywords).toContain("PostgreSQL");
      expect(keywords).toContain("Docker");

      expect(validated.responsibilities.length).toBeGreaterThan(0);
      expect(validated.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });
});
