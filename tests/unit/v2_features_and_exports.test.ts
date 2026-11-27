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
import { countIndividualSkills } from "@/lib/cache/vaultClientCache";
import { analyzeRoleFitAgainstVault, suggestSkillsToAddFromJd } from "@/lib/scoring/roleFitInsight";
import { classifySkillGroupName } from "@/lib/services/portfolioSkillGrouping";
import { JDAnalysisService } from "@/lib/services/jdAnalysisService";
import { budgetResumeForOnePageA4, estimateA4DensityUnits } from "@/lib/editor/onePageA4Budgeter";
import {
  adaptSummaryForRole,
  extractProfileSummaryFromEntries,
  normalizeDistinctAwardIssuer,
  orderSkillsForRole,
  selectExperienceBulletsForRole,
  selectProjectAnglePoints,
  sortProjectsByConfidenceAndRelevance,
} from "@/lib/tailoring/projectAngleSelector";
import { ResumeDocStore } from "@/lib/editor/resumeDocStore";
import { buildResumePdfFilename, generateResumePdfBlob } from "@/lib/export/pdfGenerator";
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

  it("counts all unique individual skills across skill groups instead of category count", () => {
    const count = countIndividualSkills([
      {
        entryType: "skill_group",
        title: "Languages & Backend",
        bullets: [
          { text: "Python, TypeScript, SQL" },
          { text: "Node.js" },
        ],
      },
      {
        entryType: "skill_group",
        title: "Cloud & Security",
        bullets: [
          { text: "Cloud Security: AWS, Docker, SQL" }, // SQL deduplicated
        ],
      },
      {
        entryType: "experience",
        title: "Engineer",
        bullets: [{ text: "Built APIs with Redis" }],
      },
    ]);

    expect(count).toBe(6); // Python, TypeScript, SQL, Node.js, AWS, Docker
  });

  it("synthesizes specific role-fit strengths and unclear gaps like Embeddings from Career Vault", () => {
    const jd = `
      AI Systems Engineer
      We are looking for an engineer experienced with LLMs, AI agents, RAG, and text embeddings using FastAPI and PostgreSQL.
    `;

    const insight = analyzeRoleFitAgainstVault(jd, [
      {
        id: "proj_1",
        entryType: "project",
        title: "Nyaaya AI — Legal Awareness Platform",
        bullets: [
          { text: "Next.js | Groq | RAG | Embeddings | NLP" },
          { text: "Built multi-step LLM agent workflows with RAG orchestration and FastAPI services." },
        ],
      },
      {
        id: "sk_1",
        entryType: "skill_group",
        title: "Databases",
        bullets: [{ text: "PostgreSQL, Redis" }],
      },
    ]);

    expect(insight.extractedTitle).toBe("AI Systems Engineer");
    expect(insight.matchedSkills).toEqual(expect.arrayContaining(["LLMs", "AI Agents", "RAG", "FastAPI"]));
    expect(insight.tagOnlySkills).toEqual(expect.arrayContaining(["Embeddings", "PostgreSQL"]));
    expect(insight.missingSkills).toContain("Embeddings");
    expect(insight.summaryInsight).toContain("Nyaaya AI");
    expect(insight.summaryInsight).toContain("Embeddings");

    const parsedJd = JDAnalysisService.analyzeDeterministic(jd);
    const canonicals = parsedJd.keywords.map((k) => k.canonical);
    expect(canonicals).toEqual(expect.arrayContaining(["LLMs", "AI Agents", "Embeddings", "RAG", "FastAPI", "PostgreSQL"]));
  });

  it("budgets multi-project resumes to 1 A4 page while preserving hackathon awards and exports", async () => {
    const oversizedDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "res_a4_test",
      versionId: "ver_a4_test",
      profile: {
        name: "Abhishek Jose",
        fullName: "Abhishek Jose",
        headline: "Third-year Computer Engineering student",
        summary: "Third-year Computer Engineering student",
        email: "abhishek@example.com",
        links: [],
      },
      sections: [],
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [
        {
          id: "exp_1",
          company: "GDG CRCE",
          position: "Technical Lead",
          startDate: "2026-05-01",
          isCurrent: true,
          bullets: Array.from({ length: 5 }, (_, idx) => ({
            id: `b_exp1_${idx}`,
            text: `Led initiative ${idx + 1} building scalable infrastructure and coordinating student engineering operations across events.`,
            provenance: "bank" as const,
            sourceBulletIds: [],
            sourceFactIds: [],
            validatorStatus: "passed" as const,
          })),
        },
        {
          id: "exp_2",
          company: "GDSC CRCE",
          position: "Technical Associate",
          startDate: "2025-06-01",
          endDate: "2026-05-28",
          bullets: Array.from({ length: 4 }, (_, idx) => ({
            id: `b_exp2_${idx}`,
            text: `Organized hackathon workflows and built Next.js + Prisma event portals for 1,000+ participants across colleges (${idx + 1}).`,
            provenance: "bank" as const,
            sourceBulletIds: [],
            sourceFactIds: [],
            validatorStatus: "passed" as const,
          })),
        },
      ],
      projects: [
        {
          id: "p1",
          name: "Sponzy — Sponsorship Marketplace",
          bullets: [
            { id: "p1b0", text: "Flask | PostgreSQL | JavaScript", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
            { id: "p1b1", text: "Built real-time chat and sponsorship matching.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
            { id: "p1b2", text: "Added analytics tracking for event organizers.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
          ],
        },
        {
          id: "p2",
          name: "Nyaaya AI — Legal Awareness Platform",
          bullets: [
            { id: "p2b0", text: "Next.js | Groq | RAG | Embeddings | NLP", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
            { id: "p2b1", text: "Implemented LLM-powered retrieval and conversational AI agents for plain-language legal guidance.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
          ],
        },
        {
          id: "p3",
          name: "Hangout — Group Itinerary Planner",
          bullets: [
            { id: "p3b0", text: "Implemented constraint-based itinerary optimization.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
          ],
        },
        {
          id: "p4",
          name: "KrishiMitra AI — Farmer Decision Support",
          bullets: [
            { id: "p4b0", text: "Built Flutter + Flask + ML advisory platform.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
          ],
        },
      ],
      education: [
        { id: "edu_1", institution: "FRCRCE", degree: "B.E. in Computer Engineering", startDate: "2024", endDate: "2028-05-28" },
      ],
      skills: [
        { name: "Python", category: "Languages" },
        { name: "LLMs", category: "AI & GenAI" },
      ],
      awards: [
        { id: "aw_1", name: "2x Hackathon Winner [PKP Hacks]", issuer: "" },
        { id: "aw_2", name: "2x Hackathon Winner [Pixels Sies]", issuer: "" },
      ],
      certifications: [
        { id: "cert_1", name: "Supervised ML", issuer: "Coursera" },
      ],
    };

    const fitted = budgetResumeForOnePageA4(oversizedDoc, { jdKeywords: ["LLMs", "RAG", "agents"] });
    expect(fitted.profile.summary).toBe("");
    expect(fitted.awards?.map((a) => a.name)).toContain("2x Hackathon Winner [PKP Hacks]");
    expect((fitted.projects || []).length).toBeLessThanOrEqual(3);
    expect(fitted.projects?.[0].name).toContain("Nyaaya AI");
    expect(estimateA4DensityUnits(fitted)).toBeLessThanOrEqual(3250);
    expect(normalizeResumeForExport(fitted).orderedSectionTypes[0]).toBe("skills");

    const txt = PlainTextSerializer.serialize(fitted);
    expect(txt).toContain("ACHIEVEMENTS & AWARDS");
    expect(txt).toContain("2x Hackathon Winner [PKP Hacks]");

    const docxBlob = await DocxGenerator.generateDocxBlob(fitted);
    const zip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("2x Hackathon Winner [PKP Hacks]");
  });

  it("selects distinct role angles from project descriptionContext and honors confidence ranking", () => {
    const multiAngleProject = {
      title: "Telemetry Cloud Hub",
      descriptionContext: [
        "Designed PostgreSQL partitioning and Redis caching pipelines sustaining 1,200 writes/sec.",
        "Built semantic vector search with embeddings and LLM tool-calling agents for log triage.",
        "Implemented responsive React and Tailwind dashboards for live alert inspection.",
      ].join(" "),
      bullets: [
        { id: "b_stack", text: "Next.js | PostgreSQL | Redis | Embeddings", sortOrder: 0 },
        { id: "b_gen", text: "Delivered telemetry portal for developer teams.", sortOrder: 1 },
      ],
    };

    const backendAngle = selectProjectAnglePoints({
      ...multiAngleProject,
      jdKeywords: ["PostgreSQL", "Redis", "Backend", "API"],
      jdTitle: "Backend Engineer",
      maxBullets: 2,
    });
    expect(backendAngle.bullets[0]).toBe("Next.js | PostgreSQL | Redis | Embeddings");
    expect(backendAngle.bullets.some((b) => b.includes("PostgreSQL partitioning"))).toBe(true);
    expect(backendAngle.usedSummaryPointsCount).toBeGreaterThanOrEqual(1);

    const aiAngle = selectProjectAnglePoints({
      ...multiAngleProject,
      jdKeywords: ["LLM", "Embeddings", "Agents", "Semantic Search"],
      jdTitle: "AI Engineer",
      maxBullets: 2,
    });
    expect(aiAngle.bullets.some((b) => b.includes("semantic vector search"))).toBe(true);

    const frontendAngle = selectProjectAnglePoints({
      ...multiAngleProject,
      jdKeywords: ["React", "Tailwind", "Frontend", "UI"],
      jdTitle: "Frontend Engineer",
      maxBullets: 2,
    });
    expect(frontendAngle.bullets.some((b) => b.includes("React and Tailwind dashboards"))).toBe(true);

    const rankedProjects = sortProjectsByConfidenceAndRelevance(
      [
        {
          id: "proj_low_conf",
          title: "SQL Helper CLI",
          sortOrder: 3,
          descriptionContext: "Built SQLite helper script.",
          bullets: [{ id: "pb1", text: "Built SQLite query runner in Python." }],
        },
        {
          id: "proj_high_conf",
          title: "Query Engine Studio",
          sortOrder: 0,
          descriptionContext: "Built SQLite query runner in Python.",
          bullets: [{ id: "pb2", text: "Built SQLite query runner in Python." }],
        },
      ],
      ["Python", "SQLite"],
      "Backend Intern"
    );
    expect(rankedProjects[0].id).toBe("proj_high_conf");

    const confDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "res_conf",
      versionId: "ver_conf",
      profile: { name: "Alex", fullName: "Alex", links: [] },
      sections: [],
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [],
      projects: [
        {
          id: "p_low",
          name: "Low Confidence Project",
          confidenceRank: 3,
          bullets: [{ id: "pl1", text: "Built Python API service.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" }],
        },
        {
          id: "p_high",
          name: "High Confidence Project",
          confidenceRank: 0,
          bullets: [{ id: "ph1", text: "Built Python API service.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" }],
        },
      ],
      education: [],
      skills: [],
    };
    const budgeted = budgetResumeForOnePageA4(confDoc, { jdKeywords: ["Python", "API"] });
    expect(budgeted.projects?.[0].id).toBe("p_high");
  });

  it("extracts narrative summary, prioritizes technical bullets, preserves editor reordering, and exports named PDF", async () => {
    const summary = extractProfileSummaryFromEntries(
      [
        {
          entryType: "profile",
          title: "Personal Details",
          descriptionContext: "Third-year Computer Engineering student",
          bullets: [{ text: "Headline: Third-year Computer Engineering student" }],
        },
        {
          entryType: "profile",
          title: "Professional Summary",
          descriptionContext:
            "Computer Engineering student focused on full-stack systems, LLM agents, and production APIs.",
          bullets: [],
        },
      ],
      "Third-year Computer Engineering student"
    );
    expect(summary).toContain("LLM agents, and production APIs");

    const expBullets = selectExperienceBulletsForRole({
      bullets: [
        { id: "b1", text: "Serving as a core council member, managing technical initiatives across activities." },
        { id: "b2", text: "Coordinating registration and event operations across colleges." },
        {
          id: "b3",
          text: "Architected end-to-end hackathon infrastructure for 259 online and 52 offline teams with HMAC check-ins.",
        },
        {
          id: "b4",
          text: "Optimized backend throughput via Redis distributed locks and PostgreSQL pooling at <500ms p95 latency.",
        },
      ],
      jdKeywords: ["PostgreSQL", "API", "Python"],
      jdTitle: "AI Engineer",
      maxBullets: 2,
    });
    expect(expBullets.map((b) => b.id)).toEqual(expect.arrayContaining(["b3", "b4"]));
    expect(normalizeDistinctAwardIssuer("2x Hackathon Winner [Pixels Sies]", "2x Hackathon Winner [Pixels Sies]")).toBe("");

    const store = new ResumeDocStore({
      schemaVersion: 1,
      documentId: "res_reorder",
      versionId: "ver_reorder",
      profile: {
        name: "Alex Morgan",
        fullName: "Alex Morgan",
        headline: "AI Engineer",
        email: "alex@example.com",
        links: [],
      },
      sections: [],
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "A4", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [
        { id: "e1", company: "Old Co", position: "Intern", startDate: "2024-01", endDate: "2024-06", bullets: [] },
        { id: "e2", company: "New Co", position: "Engineer", startDate: "2025-01", isCurrent: true, bullets: [] },
      ],
      projects: [
        { id: "p1", name: "First Project", bullets: [{ id: "pb1", text: "Built backend API.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" }] },
        { id: "p2", name: "Second Project", bullets: [{ id: "pb2", text: "Built agent pipeline.", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" }] },
      ],
      education: [],
      skills: [],
    });
    store.reorderExperience(0, 1);
    store.reorderProject(0, 1);
    const reordered = store.getState().doc;
    expect(reordered.experience?.[0].id).toBe("e2");
    expect(reordered.projects?.[0].id).toBe("p2");

    const preserved = budgetResumeForOnePageA4(reordered);
    expect(preserved.projects?.[0].id).toBe("p2");

    const filename = buildResumePdfFilename(reordered, { resumeTitle: "AI Engineer, Agent Development resume" });
    expect(filename).toBe("Alex_AI_Engineer_Agent_Development.pdf");

    const pdfBlob = generateResumePdfBlob(reordered);
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe("%PDF-");

    const adaptedSummary = adaptSummaryForRole({
      rawSummary: "Student who likes building web apps.",
      headline: "Computer Engineering Student",
      entries: [
        {
          entryType: "project",
          title: "Legal RAG Engine — Compliance QA",
          descriptionContext: "Next.js | RAG | Embeddings | Python",
          bullets: [{ text: "Built LLM retrieval workflows and vector embeddings." }],
        },
        {
          entryType: "project",
          title: "Event Marketplace",
          descriptionContext: "Flask | HTML | CSS",
          bullets: [{ text: "Built sponsorship forms." }],
        },
      ],
      jdKeywords: ["LLMs", "RAG", "Embeddings", "Python", "Rust"],
      jdTitle: "AI Engineer",
    });
    expect(adaptedSummary).toContain("AI Engineer");
    expect(adaptedSummary).toContain("RAG");
    expect(adaptedSummary).not.toContain("Rust");

    const reorderedSkills = orderSkillsForRole(
      [
        { name: "Git", category: "Tools" },
        { name: "Docker", category: "Cloud" },
        { name: "Python", category: "AI & Languages" },
        { name: "RAG", category: "AI & Languages" },
      ],
      ["RAG", "Python"]
    );
    expect(reorderedSkills[0].category).toBe("AI & Languages");

    const roleOverZeroPref = sortProjectsByConfidenceAndRelevance(
      [
        {
          id: "zero_match_pref1",
          title: "Campus Club Portal",
          sortOrder: 0,
          descriptionContext: "HTML | CSS",
          bullets: [{ id: "z1", text: "Built event RSVP calendar." }],
        },
        {
          id: "strong_match_pref2",
          title: "Agent Retrieval Platform",
          sortOrder: 1,
          descriptionContext: "Python | RAG | Embeddings | LLMs",
          bullets: [{ id: "s1", text: "Implemented RAG retrieval pipeline with Python and Embeddings." }],
        },
      ],
      ["Python", "RAG", "Embeddings", "LLMs"],
      "AI Engineer"
    );
    expect(roleOverZeroPref[0].id).toBe("strong_match_pref2");

    const denseDoc: ResumeDoc = {
      ...reordered,
      template: { id: "dense-single-page", version: "1.0", theme: {} },
    };
    const denseStep = AutoFitLadder.recommendedStepForOnePage(denseDoc);
    expect(denseStep).toBe(8);
    const denseFit = AutoFitLadder.evaluateFit(denseDoc, denseStep);
    expect(denseFit.fontSizePt).toBe(8.5);
    expect(denseFit.lineHeight).toBe(1.14);
    expect(denseFit.marginInches).toBe(0.34);
  });

  it("suggests missing technical and soft skills from uploaded JD grouped for Career Vault addition", () => {
    const jd = `
      AI Systems Engineer
      Responsibilities:
      - Collaborate cross-functionally with product teams, take end-to-end ownership of agent workflows, and communicate findings clearly.
      - Deploy containerized Python services using Docker and vector search (Pinecone).
      - Strong problem-solving and debugging skills required.
    `;

    const vaultEntries = [
      {
        id: "sk_tech",
        entryType: "skill_group",
        title: "Languages",
        bullets: [{ text: "Python, TypeScript" }],
      },
      {
        id: "sk_soft",
        entryType: "skill_group",
        title: "Soft Skills & Collaboration",
        bullets: [{ text: "Problem Solving" }],
      },
    ];

    const suggestions = suggestSkillsToAddFromJd(jd, vaultEntries);
    const techNames = suggestions.technicalAndTools.map((s) => s.skill);
    const softNames = suggestions.softSkills.map((s) => s.skill);

    // Already in Vault -> omitted from suggestions
    expect(techNames).not.toContain("Python");
    expect(softNames).not.toContain("Problem Solving");

    // Missing JD skills -> suggested with proper Vault category
    expect(techNames).toEqual(expect.arrayContaining(["Docker", "Pinecone / Weaviate / FAISS"]));
    const dockerItem = suggestions.technicalAndTools.find((s) => s.skill === "Docker");
    expect(dockerItem?.vaultGroup).toBe("Cloud & Deployment");

    expect(softNames).toEqual(
      expect.arrayContaining([
        "Cross-Functional Collaboration",
        "Ownership & Accountability",
        "Communication",
      ])
    );
    expect(suggestions.softSkills[0].vaultGroup).toBe("Soft Skills & Collaboration");
    expect(classifySkillGroupName("Communication")).toBe("Soft Skills & Collaboration");

    const parsedJd = JDAnalysisService.analyzeDeterministic(jd);
    const softKeywords = parsedJd.keywords.filter((k) => k.category === "soft_skill").map((k) => k.canonical);
    expect(softKeywords).toEqual(
      expect.arrayContaining(["Cross-Functional Collaboration", "Communication", "Ownership & Accountability"])
    );
  });
});
