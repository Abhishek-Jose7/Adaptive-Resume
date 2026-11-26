import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { normalizeResumeForExport } from "@/lib/export/docNormalizer";
import { PlainTextSerializer } from "@/lib/export/plainTextSerializer";
import { DocxGenerator } from "@/lib/export/docxGenerator";
import { extractMetricFactsFromText } from "@/lib/services/resumeProvenanceService";
import { computeStaleStageInfo } from "@/lib/utils/applicationStageUtils";
import { buildStarAndQuestionPrep } from "@/lib/services/interviewPrepService";
import { buildDomainGroupedSkillBadges } from "@/lib/services/portfolioSkillGrouping";
import { sortResumeDocChronologically, compareReverseChronological } from "@/lib/utils/resumeOrderUtils";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { ResumeDoc } from "@/types/resume";

describe("Export Parity, Vault Sync, Interview Prep & Portfolio Analytics", () => {
  it("normalizes canonical doc.sections, certifications, profile.links, and visibility into DOCX & TXT", async () => {
    const sectionsOnlyDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "res_sections_1",
      versionId: "ver_sections_1",
      profile: {
        name: "Maya Rao",
        fullName: "Maya Rao",
        headline: "Backend Platform Engineer",
        email: "maya@example.com",
        links: [{ label: "GitHub", url: "https://github.com/mayarao" }],
      },
      sections: [
        {
          id: "sec_exp",
          type: "experience",
          heading: "Experience",
          visible: true,
          items: [
            {
              id: "item_1",
              sourceBulletIds: ["b1"],
              title: "Software Engineer",
              organization: "Acme Cloud",
              dates: { start: "2023-01", current: true },
              bullets: [
                {
                  id: "rb_1",
                  text: "Cut p99 API latency by 42% using PostgreSQL partial indexes.",
                  provenance: "bank",
                  sourceBulletIds: ["b1"],
                  sourceFactIds: [],
                  validatorStatus: "passed",
                },
              ],
            },
          ],
        },
        {
          id: "sec_cert",
          type: "certifications",
          heading: "Certifications",
          visible: true,
          items: [
            {
              id: "cert_1",
              sourceBulletIds: [],
              title: "AWS Certified Developer",
              organization: "Amazon Web Services",
              dates: { start: "2025" },
              bullets: [],
            },
          ],
        },
        {
          id: "sec_projects",
          type: "projects",
          heading: "Projects",
          visible: false, // Hidden section must not appear in export
          items: [
            {
              id: "proj_hidden",
              sourceBulletIds: [],
              title: "Secret Stealth Project",
              bullets: [],
            },
          ],
        },
      ],
      template: {
        id: "classic-ats",
        version: "1.0",
        theme: { sectionOrder: ["certifications", "experience"] },
      },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
    };

    const normalized = normalizeResumeForExport(sectionsOnlyDoc);
    expect(normalized.experiences.length).toBe(1);
    expect(normalized.certifications[0].name).toBe("AWS Certified Developer");
    expect(normalized.projects.length).toBe(0);
    expect(normalized.links[0].url).toBe("https://github.com/mayarao");

    const plainText = PlainTextSerializer.serialize(sectionsOnlyDoc);
    expect(plainText).toContain("GitHub: https://github.com/mayarao");
    expect(plainText).toContain("AWS Certified Developer");
    expect(plainText).not.toContain("Secret Stealth Project");
    // sectionOrder places certifications before experience
    expect(plainText.indexOf("CERTIFICATIONS")).toBeLessThan(plainText.indexOf("PROFESSIONAL EXPERIENCE"));

    const docxBlob = await DocxGenerator.generateDocxBlob(sectionsOnlyDoc);
    expect(docxBlob.size).toBeGreaterThan(1000);
    const zip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toBeTruthy();
    expect(documentXml).toContain("AWS Certified Developer");
    expect(documentXml).toContain("https://github.com/mayarao");
    expect(documentXml).not.toContain("Secret Stealth Project");
  });

  it("extracts deterministic metric facts when backporting edited bullets to Career Vault", () => {
    const facts = extractMetricFactsFromText(
      "Reduced PostgreSQL checkout latency by 38% across 120k users and saved $45,000 annually in 14ms response times."
    );
    const values = facts.map((f) => f.valueText.toLowerCase());
    expect(values.some((v) => v.includes("38%"))).toBe(true);
    expect(values.some((v) => v.includes("$45,000"))).toBe(true);
    expect(values.some((v) => v.includes("14ms"))).toBe(true);
    expect(values.some((v) => v.includes("120k users"))).toBe(true);
  });

  it("computes stale-stage reminders for Applied/Screening/Interview applications", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    const staleApplied = computeStaleStageInfo(
      {
        status: "Applied",
        appliedAt: "2026-11-15T12:00:00Z",
        updatedAt: "2026-11-15T12:00:00Z",
      },
      now
    );
    expect(staleApplied.daysInStage).toBe(11);
    expect(staleApplied.isStale).toBe(true);

    const freshInterview = computeStaleStageInfo(
      {
        status: "Interview",
        updatedAt: "2026-11-25T12:00:00Z",
      },
      now
    );
    expect(freshInterview.daysInStage).toBe(1);
    expect(freshInterview.isStale).toBe(false);

    const closedOffer = computeStaleStageInfo(
      {
        status: "Offer",
        updatedAt: "2026-11-01T12:00:00Z",
      },
      now
    );
    expect(closedOffer.isStale).toBe(false);
  });

  it("builds truth-grounded STAR stories and gap checklist without fabricating metrics", () => {
    const { starStories, questionChecklist } = buildStarAndQuestionPrep({
      jobTitle: "Backend Engineer",
      company: "ScaleOps",
      entries: [
        {
          id: "ent_1",
          userId: "u1",
          entryType: "experience",
          title: "Backend Intern",
          organization: "FinTech Labs",
          isCurrent: false,
          visibility: "resume",
          verificationStatus: "user_verified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [
            {
              id: "b_unmeasured",
              userId: "u1",
              entryId: "ent_1",
              text: "Built REST endpoints in Node.js for internal billing reconciliation.",
              visibility: "resume",
              verificationStatus: "user_verified",
              usagePolicy: "eligible",
              sortOrder: 0,
              rowVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              facts: [],
            },
          ],
        },
      ],
      gapReport: {
        jobId: "j1",
        totalMissingCount: 2,
        inBankNotOnResume: [
          {
            keyword: {
              id: "k1",
              canonical: "PostgreSQL",
              synonyms: [],
              category: "tool",
              priority: "must_have",
              importance: 0.9,
              evidencePhrase: "PostgreSQL",
              userOverride: "none",
            },
            category: "in_bank_not_on_resume",
            recommendedAction: "Add PostgreSQL bullet",
            uiLabel: "In Data Bank",
          },
        ],
        inProfileUnverified: [],
        missingFromBank: [
          {
            keyword: {
              id: "k2",
              canonical: "Kubernetes",
              synonyms: [],
              category: "tool",
              priority: "nice_to_have",
              importance: 0.6,
              evidencePhrase: "Kubernetes",
              userOverride: "none",
            },
            category: "missing_from_bank",
            recommendedAction: "Bridge gap",
            uiLabel: "Missing",
          },
        ],
      },
      rounds: [{ roundName: "Technical Screen", status: "scheduled" }],
    });

    expect(starStories.length).toBe(1);
    expect(starStories[0].result).toBeNull();
    expect(starStories[0].needsMetricPrompt).toBe(true);
    expect(questionChecklist.some((q) => q.keyword === "PostgreSQL")).toBe(true);
    expect(questionChecklist.some((q) => q.keyword === "Kubernetes")).toBe(true);
  });

  it("groups Career Graph skill edges into technical domains with evidence counts", () => {
    const groups = buildDomainGroupedSkillBadges({
      graphEdges: [
        { relationshipType: "used_skill", targetType: "skill", targetId: "postgresql", metadataJson: { skillName: "PostgreSQL" } },
        { relationshipType: "used_skill", targetType: "skill", targetId: "postgresql", metadataJson: { skillName: "PostgreSQL" } },
        { relationshipType: "used_skill", targetType: "skill", targetId: "react", metadataJson: { skillName: "React" } },
        { relationshipType: "used_skill", targetType: "skill", targetId: "docker", metadataJson: { skillName: "Docker" } },
      ],
    });

    const dbGroup = groups.find((g) => g.domain === "Databases & Streaming");
    expect(dbGroup?.skills[0]).toEqual({
      name: "PostgreSQL",
      evidenceCount: 2,
      source: "career_graph",
    });
  });

  it("sorts experiences & education reverse-chronologically (current role on top) and recommends 1-page fit", () => {
    const entries = [
      { title: "Old Intern", startDate: "2024-05", endDate: "2024-08", isCurrent: false },
      { title: "Technical Lead", startDate: "2026-05-01", endDate: null, isCurrent: true },
      { title: "Mid Engineer", startDate: "2025-01", endDate: "2025-12", isCurrent: false },
    ].sort(compareReverseChronological);

    expect(entries.map((e) => e.title)).toEqual(["Technical Lead", "Mid Engineer", "Old Intern"]);

    const doc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "res_order",
      versionId: "ver_order",
      profile: { name: "Alex", fullName: "Alex", links: [] },
      sections: [],
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [
        {
          id: "e_old",
          company: "Past Corp",
          position: "Junior Dev",
          startDate: "2024-01",
          endDate: "2024-09",
          isCurrent: false,
          bullets: Array.from({ length: 8 }, (_, idx) => ({
            id: `b_${idx}`,
            text: "Developed scalable TypeScript microservices with observability dashboards and automated CI deployment checks.",
            provenance: "bank" as const,
            sourceBulletIds: [],
            sourceFactIds: [],
            validatorStatus: "passed" as const,
          })),
        },
        {
          id: "e_curr",
          company: "GDG CRCE",
          position: "Technical Lead",
          startDate: "2026-05-01",
          endDate: null,
          isCurrent: true,
          bullets: [
            {
              id: "b_curr",
              text: "Serving as a core council member, managing technical initiatives and event execution across GDG activities.",
              provenance: "bank",
              sourceBulletIds: [],
              sourceFactIds: [],
              validatorStatus: "passed",
            },
          ],
        },
      ],
      projects: [],
      education: [],
      skills: [],
      certifications: [],
    };

    const sortedDoc = sortResumeDocChronologically(doc);
    expect(sortedDoc.experience?.[0].company).toBe("GDG CRCE");

    const recommendedStep = AutoFitLadder.recommendedStepForOnePage(sortedDoc);
    expect(recommendedStep).toBeGreaterThanOrEqual(1);
    expect(recommendedStep).toBeLessThanOrEqual(7);
  });
});
