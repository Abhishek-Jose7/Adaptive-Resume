import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";
import { ResumeStructuringService } from "@/lib/parsers/resumeStructuringService";

describe("User Real Resume Parsing Inspection: abhishek (1).pdf", () => {
  it("should extract and structure all roles and skill groups from abhishek (1).pdf", async () => {
    const filePath = path.join(process.cwd(), "abhishek (1).pdf");
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    const pdfResult = await parsePdfBuffer(buffer, "abhishek (1).pdf");
    expect(pdfResult.text.length).toBeGreaterThan(100);

    const sections = ResumeStructuringService.structureResumeText(pdfResult.text, "abhishek (1).pdf");
    expect(sections.length).toBeGreaterThan(5);

    // Verify all 3 experience roles are parsed
    const experiences = sections.filter((s) => s.entryType === "experience");
    expect(experiences.length).toBe(3);
    const roleTitles = experiences.map((e) => e.title);
    expect(roleTitles).toContain("Technical Associate");
    expect(roleTitles).toContain("Technical Lead");
    expect(roleTitles).toContain("Technical Intern");

    // Verify Technical Intern has FRCRCE Bandra as organization
    const internRole = experiences.find((e) => e.title === "Technical Intern");
    expect(internRole?.organization).toContain("FRCRCE Bandra");
    expect(internRole?.bullets.length).toBe(2);

    // Verify skill categories are parsed into distinct groups
    const skillGroups = sections.filter((s) => s.entryType === "skill_group");
    const skillTitles = skillGroups.map((s) => s.title);
    expect(skillTitles).toContain("Cloud & Deployment");
    expect(skillTitles).toContain("Databases & Tools");
    expect(skillTitles).toContain("Languages");
    expect(skillTitles).toContain("AI & GenAI");
    expect(skillTitles).toContain("ML & Computer Vision");
    expect(skillTitles).toContain("Web & Backend");
  }, 15000);
});
