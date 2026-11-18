import { describe, it, expect, beforeAll } from "vitest";
import { ExperienceIsolationEngine } from "../../src/lib/tailoring/experienceIsolation";
import { ProvenanceService } from "../../src/lib/tailoring/provenanceService";
import { VersionDiffEngine } from "../../src/lib/editor/versionDiffEngine";
import { ResumeQualityGateService } from "../../src/lib/export/resumeQualityGate";
import { JdIntelligenceService } from "../../src/lib/services/jdIntelligenceService";
import { ProjectRecommenderService } from "../../src/lib/services/projectRecommenderService";
import { SkillsRoadmapEngine } from "../../src/lib/scoring/skillsRoadmapEngine";
import { CareerGraphService } from "../../src/lib/services/careerGraphService";
import { QuantificationAssistantService } from "../../src/lib/services/quantificationAssistant";
import { UsageLimitService } from "../../src/lib/services/usageLimitService";
import { ApplicationService } from "../../src/lib/services/applicationService";
import { db } from "../../src/lib/db/client";
import { users, applications, jobs, bankEntries, achievementBullets, bulletFacts } from "../../src/lib/db/schema";
import { ResumeDoc } from "../../src/types/resume";
import { BankEntry, AchievementBullet, BulletFact } from "../../src/types/bank";
import { JDAnalysis } from "../../src/types/job";

describe("Section 18: Advanced Enterprise & Integrity Extensions (v1.2)", () => {
  const testUserId = `test_s18_${Date.now()}`;

  beforeAll(async () => {
    await db.insert(users).values({
      id: testUserId,
      clerkSubject: `clerk_${testUserId}`,
      username: `s18_${testUserId}`,
      email: `${testUserId}@example.com`,
    });
  });

  // 18.1 Fact Provenance & Traceability
  describe("18.1 Fact Provenance & Traceability", () => {
    it("should build accurate claim maps and compute word-level diffs", () => {
      const originalText = "Developed web app with React and Node.js for team projects";
      const rewrittenText = "Engineered responsive web app with React and Node.js, improving load time by 30%";

      const mockBullet: AchievementBullet = {
        id: "b1",
        userId: testUserId,
        entryId: "e1",
        text: originalText,
        visibility: "private",
        verificationStatus: "user_verified",
        usagePolicy: "eligible",
        sortOrder: 0,
        rowVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFact: BulletFact = {
        id: "f1",
        bulletId: "b1",
        userId: testUserId,
        factType: "tool",
        factKey: "tool_react",
        valueText: "React",
        createdAt: new Date(),
      };

      const record = ProvenanceService.buildTraceRecord(
        "b1",
        originalText,
        rewrittenText,
        [mockBullet],
        [mockFact],
        [
          { claim: "React", evidenceIds: ["f1"], claimType: "tool" },
          { claim: "30%", evidenceIds: [], claimType: "metric" },
        ]
      );

      expect(record.originalText).toBe(originalText);
      expect(record.rewrittenText).toBe(rewrittenText);
      expect(record.sourceFactIds).toContain("f1");
      expect(record.approvalStatus).toBe("pending");
      expect(record.diffParts.length).toBeGreaterThan(0);

      // Verify traceability check detects unsupported claims
      const check = ProvenanceService.verifyTraceability(record.claimMap, new Set(["f1"]));
      expect(check.isValid).toBe(false);
      expect(check.unsupportedClaims).toContain("30%");
    });
  });

  // 18.2 Experience Isolation
  describe("18.2 Experience Isolation in Tailoring Engine", () => {
    const targetEntry: BankEntry = {
      id: "proj_health",
      userId: testUserId,
      entryType: "project",
      title: "Healthcare Clinic Portal",
      organization: "Clinic Corp",
      startDate: "2023-01-01",
      endDate: "2023-06-01",
      isCurrent: false,
      visibility: "private",
      verificationStatus: "user_verified",
      sortOrder: 0,
      rowVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      bullets: [],
    };

    const targetBullets: AchievementBullet[] = [
      {
        id: "tb1",
        userId: testUserId,
        entryId: "proj_health",
        text: "Built appointment scheduling system with PostgreSQL",
        visibility: "private",
        verificationStatus: "user_verified",
        usagePolicy: "eligible",
        sortOrder: 0,
        rowVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const targetFacts: BulletFact[] = [
      {
        id: "f1",
        bulletId: "tb1",
        userId: testUserId,
        factType: "tool",
        factKey: "tool_postgres",
        valueText: "PostgreSQL",
        createdAt: new Date(),
      },
    ];

    const unrelatedEntries: BankEntry[] = [
      {
        id: "proj_fintech",
        userId: testUserId,
        entryType: "project",
        title: "Crypto Trading Engine",
        organization: "Fintech Lab",
        startDate: "2023-07-01",
        isCurrent: true,
        visibility: "private",
        verificationStatus: "user_verified",
        sortOrder: 1,
        rowVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        bullets: [],
      },
    ];

    const unrelatedBullets: AchievementBullet[] = [
      {
        id: "ub1",
        userId: testUserId,
        entryId: "proj_fintech",
        text: "Deployed on Kubernetes cluster",
        visibility: "private",
        verificationStatus: "user_verified",
        usagePolicy: "eligible",
        sortOrder: 0,
        rowVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const unrelatedFacts: BulletFact[] = [
      {
        id: "f2",
        bulletId: "ub1",
        userId: testUserId,
        factType: "tool",
        factKey: "tool_k8s",
        valueText: "Kubernetes",
        createdAt: new Date(),
      },
    ];

    it("should pass when rewritten bullet stays strictly within project facts", () => {
      const validBullet = "Built database schema in PostgreSQL for patient appointment scheduling";
      const result = ExperienceIsolationEngine.auditIsolation(
        validBullet,
        targetEntry.id,
        [targetEntry, ...unrelatedEntries],
        [...targetBullets, ...unrelatedBullets],
        [...targetFacts, ...unrelatedFacts]
      );

      expect(result.isIsolated).toBe(true);
      expect(result.leakedEntities).toHaveLength(0);
    });

    it("should reject and flag cross-project leak when technologies or claims from unrelated projects are transferred", () => {
      // Trying to inject Kubernetes from the fintech project into the health portal!
      const leakedBullet = "Engineered portal using Kubernetes for appointment scheduling";
      const result = ExperienceIsolationEngine.auditIsolation(
        leakedBullet,
        targetEntry.id,
        [targetEntry, ...unrelatedEntries],
        [...targetBullets, ...unrelatedBullets],
        [...targetFacts, ...unrelatedFacts]
      );

      expect(result.isIsolated).toBe(false);
      expect(result.leakedEntities.length).toBeGreaterThan(0);
      expect(result.leakedEntities.some((v) => v.toLowerCase().includes("kubernetes"))).toBe(true);
      expect(result.violationMessage).toContain("Experience Isolation Failure");
    });
  });

  // 18.3 Career Graph
  describe("18.3 Career Graph", () => {
    it("should extract nodes and manage explicit career graph edges", async () => {
      const [entry] = await db
        .insert(bankEntries)
        .values({
          id: `entry_cg_${Date.now()}`,
          userId: testUserId,
          entryType: "project",
          title: "Distributed KV Store",
          visibility: "private",
          verificationStatus: "verified",
          sortOrder: 0,
        })
        .returning();

      const [bullet] = await db
        .insert(achievementBullets)
        .values({
          id: `bullet_cg_${Date.now()}`,
          userId: testUserId,
          entryId: entry.id,
          text: "Implemented Raft consensus algorithm in Go",
          visibility: "private",
          verificationStatus: "verified",
        })
        .returning();

      const [fact] = await db
        .insert(bulletFacts)
        .values({
          id: `fact_cg_${Date.now()}`,
          userId: testUserId,
          bulletId: bullet.id,
          entryId: null,
          factType: "tool",
          factKey: "tool_go",
          valueText: "Go",
        })
        .returning();

      // Query graph
      const graph = await CareerGraphService.getCareerGraph(testUserId);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(1);

      // Create explicit relationship
      const edge = await CareerGraphService.createEdge(
        testUserId,
        fact.id,
        entry.id,
        "skill_used_in_project"
      );

      expect(edge.id).toBeDefined();
      expect(edge.relationType).toBe("skill_used_in_project");

      // Verify edge exists in graph
      const updatedGraph = await CareerGraphService.getCareerGraph(testUserId);
      expect(updatedGraph.edges.some((e) => e.id === edge.id)).toBe(true);

      // Remove edge
      const removed = await CareerGraphService.deleteEdge(testUserId, edge.id);
      expect(removed).toBe(true);
    });
  });

  // 18.4 Achievement Quantification Assistant
  describe("18.4 Achievement Quantification Assistant", () => {
    it("should generate targeted context questions without fabricating metrics", () => {
      const weakDescription = "Developed a web app for a college hackathon with my team";
      const questions = QuantificationAssistantService.analyzeAndGenerateQuestions(weakDescription);

      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.some((q) => q.category === "team")).toBe(true);
      expect(questions.some((q) => q.category === "scale")).toBe(true);

      // Verify questions prompt for ground truth
      for (const q of questions) {
        expect(q.promptQuestion).toBeTruthy();
      }
    });

    it("should save candidate response as verified or estimated bullet fact", async () => {
      const [entry] = await db
        .insert(bankEntries)
        .values({
          id: `entry_qa_${Date.now()}`,
          userId: testUserId,
          entryType: "experience",
          title: "Frontend Intern",
          visibility: "private",
          verificationStatus: "verified",
          sortOrder: 0,
        })
        .returning();

      const [bullet] = await db
        .insert(achievementBullets)
        .values({
          id: `bullet_qa_${Date.now()}`,
          userId: testUserId,
          entryId: entry.id,
          text: "Built search filtering system",
          visibility: "private",
          verificationStatus: "verified",
        })
        .returning();

      const createdQuestions = await QuantificationAssistantService.createQuestionsForBullet(
        testUserId,
        bullet.id,
        entry.id,
        bullet.text
      );

      expect(createdQuestions.length).toBeGreaterThan(0);
      const qToAnswer = createdQuestions[0];

      const answered = await QuantificationAssistantService.answerQuestion(
        testUserId,
        qToAnswer.id,
        "Scaled query caching to support 15,000 active concurrent searches",
        15000,
        "searches/sec",
        true // verified
      );

      expect(answered.question.status).toBe("answered");
      expect(answered.createdFact).toBeDefined();
      expect(answered.createdFact?.valueNumber).toBe(15000);
      expect(answered.createdFact?.verificationStatus).toBe("user_verified");
    });
  });

  // 18.5 Resume Version Diff
  describe("18.5 Resume Version Diff Engine", () => {
    it("should compute bullet additions, deletions, and rewrites with Data Bank sources", () => {
      const baseDoc: ResumeDoc = {
        schemaVersion: 1,
        documentId: "doc_1",
        versionId: "ver_1",
        title: "Base Engineering Resume",
        contact: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          location: "San Francisco, CA",
        },
        profile: {
          name: "Jane Doe",
          fullName: "Jane Doe",
          email: "jane@example.com",
          links: [],
        },
        template: { id: "classic-ats", version: "1", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        sections: [
          {
            id: "sec_exp",
            heading: "Experience",
            type: "experience",
            visible: true,
            items: [
              {
                id: "e1",
                sourceBulletIds: [],
                bullets: [
                  { id: "b1", text: "Maintained REST APIs and fixed bug reports", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
                  { id: "b2", text: "Legacy reporting script in Python that will be deleted", provenance: "bank", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
                ],
              },
            ],
          },
        ],
      } as any;

      const targetDoc: ResumeDoc = {
        schemaVersion: 1,
        documentId: "doc_1",
        versionId: "ver_2",
        title: "Tailored Engineering Resume",
        contact: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          location: "San Francisco, CA",
        },
        profile: {
          name: "Jane Doe",
          fullName: "Jane Doe",
          email: "jane@example.com",
          links: [],
        },
        template: { id: "classic-ats", version: "1", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        sections: [
          {
            id: "sec_exp",
            heading: "Experience",
            type: "experience",
            visible: true,
            items: [
              {
                id: "e1",
                sourceBulletIds: [],
                bullets: [
                  { id: "b1", text: "Architected high-throughput REST APIs and reduced error rate by 45%", provenance: "ai-rewrite", sourceBulletIds: ["b1"], sourceFactIds: [], validatorStatus: "passed" },
                  { id: "b3", text: "Implemented distributed tracing using OpenTelemetry", provenance: "ai-rewrite", sourceBulletIds: [], sourceFactIds: [], validatorStatus: "passed" },
                ],
              },
            ],
          },
        ],
      } as any;

      const diff = VersionDiffEngine.computeDiff(baseDoc, targetDoc, 1, 2);

      const stats = diff.summary || diff.stats;
      expect(stats.modifiedCount).toBe(1); // b1 modified
      expect((stats as any).deletedCount || stats.removedCount).toBe(1); // b2 deleted
      expect(stats.addedCount).toBe(1); // b3 added
    });
  });

  // 18.6 Job Description Intelligence
  describe("18.6 Job Description Intelligence", () => {
    it("should distinguish mandatory from preferred requirements and map evidence gaps", () => {
      const jdAnalysis: JDAnalysis = {
        schemaVersion: 1,
        role: {
          title: "Staff Backend Engineer",
          company: "Tech",
          seniority: "senior",
          location: "Remote",
          workMode: "remote",
          yearsExperience: { min: 5, max: 10 },
          domain: ["cloud"],
          education: [],
        },
        keywords: [
          {
            id: "kw_go",
            term: "Go",
            canonical: "go",
            category: "technical_skill",
            importance: 1.0,
            priority: "must_have",
            evidencePhrase: null,
            userOverride: "none",
            synonyms: [],
            matchStatus: "confirmed",
          } as any,
          {
            id: "kw_kafka",
            term: "Kafka",
            canonical: "kafka",
            category: "technical_skill",
            importance: 0.5,
            priority: "nice_to_have",
            evidencePhrase: null,
            userOverride: "none",
            synonyms: [],
            matchStatus: "missing",
          } as any,
        ],
        responsibilities: [
          { id: "resp_1", text: "Design distributed microservices", priority: "must_have", keywords: [] },
        ],
        constraints: [],
        ambiguityFlags: [],
        confidence: 0.95,
        sourceTextHash: "hash",
        promptVersion: "v1",
      };

      const candidateEntries: BankEntry[] = [
        {
          id: "e1",
          userId: testUserId,
          entryType: "experience",
          title: "Backend Engineer",
          isCurrent: false,
          visibility: "private",
          verificationStatus: "user_verified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [],
        },
      ];

      const candidateBullets: AchievementBullet[] = [
        {
          id: "b1",
          userId: testUserId,
          entryId: "e1",
          text: "Engineered scalable microservices in Go",
          visibility: "private",
          verificationStatus: "user_verified",
          usagePolicy: "eligible",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          facts: [],
        },
      ];

      const candidateFacts: BulletFact[] = [
        {
          id: "f1",
          userId: testUserId,
          bulletId: "b1",
          factType: "tool",
          factKey: "tool_go",
          valueText: "Go",
          createdAt: new Date(),
        },
      ];

      const report = JdIntelligenceService.analyzeQualifications(
        jdAnalysis,
        candidateEntries,
        candidateBullets,
        candidateFacts
      );

      expect(report.mandatoryRequirements.length).toBeGreaterThanOrEqual(1);
      expect(report.preferredQualifications.length).toBeGreaterThanOrEqual(1);

      const goReq = report.mandatoryRequirements.find((r) => (r.text || r.requirementText).toLowerCase().includes("go"));
      const kafkaReq = report.preferredQualifications.find((r) => (r.text || r.requirementText).toLowerCase().includes("kafka"));

      expect(goReq?.status).toBe("confirmed_match");
      expect(kafkaReq?.status).toBe("missing_evidence");
      expect(kafkaReq?.kind).toBe("preferred");
    });
  });

  // 18.7 Resume Quality Gate
  describe("18.7 Pre-Export Resume Quality Gate", () => {
    it("should block export when critical errors exist (e.g. missing contact email)", () => {
      const invalidDoc: ResumeDoc = {
        title: "Broken Resume",
        contact: {
          fullName: "Alex Smith",
          email: "", // Missing email -> critical error!
        },
        profile: {
          name: "Alex Smith",
          email: "",
          links: [],
        },
        sections: [],
      } as any;

      const audit = ResumeQualityGateService.auditResume(invalidDoc);
      expect(audit.passed).toBe(false);
      expect((audit.errors || []).some((e) => e.rule === "MISSING_CONTACT_EMAIL")).toBe(true);
    });

    it("should warn about duplicate bullets or formatting anomalies", () => {
      const docWithWarning: ResumeDoc = {
        title: "Valid Resume with Minor Warning",
        contact: {
          fullName: "Alex Smith",
          email: "alex@example.com",
        },
        profile: {
          name: "Alex Smith",
          email: "alex@example.com",
          links: [],
        },
        sections: [
          {
            id: "s1",
            heading: "Experience",
            type: "experience",
            visible: true,
            items: [
              {
                id: "e1",
                bullets: [
                  { id: "b1", text: "Developed backend API using Node.js" },
                  { id: "b2", text: "Developed backend API using Node.js" }, // duplicate bullet!
                ],
              },
            ],
          },
        ],
      } as any;

      const audit = ResumeQualityGateService.auditResume(docWithWarning);
      expect(audit.warnings.some((w) => w.rule === "DUPLICATE_BULLET")).toBe(true);
    });

    it("should pass clean, ATS-compliant resumes with verified checks", () => {
      const cleanDoc: ResumeDoc = {
        title: "Staff Engineer Resume",
        contact: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          phone: "+1 555-0199",
          location: "San Francisco, CA",
        },
        profile: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "+1 555-0199",
          location: "San Francisco, CA",
          links: [],
        },
        sections: [
          {
            id: "sec_skills",
            heading: "Skills",
            type: "skills",
            visible: true,
            items: [
              {
                id: "sk1",
                bullets: [{ id: "b_sk1", text: "TypeScript, Go, Python, SQL" }],
              },
            ],
          },
          {
            id: "sec_exp",
            heading: "Experience",
            type: "experience",
            visible: true,
            items: [
              {
                id: "exp1",
                organization: "TechCorp",
                bullets: [
                  { id: "b_exp1", text: "Architected distributed message queue reducing latency by 40%" },
                ],
              },
            ],
          },
        ],
      } as any;

      const audit = ResumeQualityGateService.auditResume(cleanDoc);
      expect(audit.passed).toBe(true);
      expect(audit.errors || []).toHaveLength(0);
      expect(audit.passedChecks.length).toBeGreaterThan(0);
    });
  });

  // 18.8 Application Workspace
  describe("18.8 Application Workspace Extensions", () => {
    it("should manage interview rounds with feedback and outcomes", async () => {
      const [app] = await db
        .insert(applications)
        .values({
          id: `app_s18_${Date.now()}`,
          userId: testUserId,
          status: "Interview",
        })
        .returning();

      const interview = await ApplicationService.addInterview(testUserId, app.id, {
        roundName: "System Design",
        roundNumber: 2,
        interviewers: "Marcus (Principal Architect)",
        prepNotes: "Review CAP theorem, Redis sharding, and write-ahead logs",
      });

      expect(interview.id).toBeDefined();
      expect(interview.roundName).toBe("System Design");
      expect(interview.status).toBe("scheduled");

      // Update outcome
      const updated = await ApplicationService.updateInterview(testUserId, interview.id, {
        status: "passed",
        feedbackNotes: "Candidate excelled on partitioning and fault tolerance questions",
      });

      expect(updated.status).toBe("passed");
      expect(updated.feedbackNotes).toContain("excelled");

      // Verify fetch with details
      const appWithInterviews = await ApplicationService.getApplication(testUserId, app.id);
      expect(appWithInterviews?.interviews.some((i) => i.id === interview.id)).toBe(true);
    });
  });

  // 18.9 Free-Tier Usage and Limits Dashboard
  describe("18.9 Free-tier Usage & Transparent Quotas", () => {
    it("should report accurate monthly quotas and never hide usage limits", async () => {
      const report = await UsageLimitService.getUsageReport(testUserId);

      expect(report.monthlyPeriod).toBeTruthy();
      expect(report.aiGenerationsLimit).toBe(50);
      expect(report.exportsLimit).toBe(20);
      expect(report.isAiQuotaExhausted).toBe(false);
      expect(report.isExportQuotaExhausted).toBe(false);
      expect(report.honestNotice).toContain("free");

      // Record an export and verify meter increment
      await UsageLimitService.recordExport(testUserId, "pdf");
      const updatedReport = await UsageLimitService.getUsageReport(testUserId);
      expect(updatedReport.exportsUsed).toBeGreaterThanOrEqual(1);
    });
  });

  // 18.10 Skills Gap Analysis & Learning Roadmap
  describe("18.10 Skills Gap Analysis and Learning Roadmap", () => {
    it("should classify skills into 3 evidence tiers without arbitrary percentages", () => {
      const jdAnalysis: JDAnalysis = {
        schemaVersion: 1,
        role: {
          title: "Senior Full Stack Engineer",
          company: "FullStack Co",
          seniority: "senior",
          location: "Remote",
          workMode: "remote",
          yearsExperience: { min: 4, max: 8 },
          domain: ["web"],
          education: [],
        },
        keywords: [
          {
            id: "kw_react",
            term: "React",
            canonical: "react",
            category: "technical_skill",
            importance: 1.0,
            priority: "must_have",
            evidencePhrase: null,
            userOverride: "none",
            synonyms: [],
            matchStatus: "confirmed",
          } as any,
          {
            id: "kw_rust",
            term: "Rust",
            canonical: "rust",
            category: "technical_skill",
            importance: 0.5,
            priority: "nice_to_have",
            evidencePhrase: null,
            userOverride: "none",
            synonyms: [],
            matchStatus: "missing",
          } as any,
        ],
        responsibilities: [],
        constraints: [],
        ambiguityFlags: [],
        confidence: 0.95,
        sourceTextHash: "hash",
        promptVersion: "v1",
      };

      const candidateEntries: BankEntry[] = [
        {
          id: "e1",
          userId: testUserId,
          entryType: "experience",
          title: "Frontend Developer",
          descriptionContext: "Built web apps with React and TypeScript",
          isCurrent: false,
          visibility: "private",
          verificationStatus: "user_verified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [],
        },
      ];

      const candidateBullets: AchievementBullet[] = [
        {
          id: "b1",
          userId: testUserId,
          entryId: "e1",
          text: "Engineered performant dashboard in React",
          visibility: "private",
          verificationStatus: "user_verified",
          usagePolicy: "eligible",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          facts: [],
        },
      ];

      const candidateFacts: BulletFact[] = [
        {
          id: "f1",
          userId: testUserId,
          bulletId: "b1",
          factType: "tool",
          factKey: "tool_react",
          valueText: "React",
          createdAt: new Date(),
        },
      ];

      const roadmap = SkillsRoadmapEngine.generateRoadmap(
        jdAnalysis,
        candidateEntries,
        candidateBullets,
        candidateFacts
      );

      // React has strong verified evidence
      expect(roadmap.strongEvidenceSkills.some((s) => s.skillName.toLowerCase() === "react")).toBe(true);

      // Rust is not in Bank -> placed honestly into unrecordedSkills with recommended project ideas!
      const unrecordedRust = roadmap.unrecordedSkills.find((s) => s.skillName.toLowerCase() === "rust");
      expect(unrecordedRust).toBeDefined();
      expect(unrecordedRust?.practicalProjectIdeas.length).toBeGreaterThan(0);
      expect(unrecordedRust?.learningResources.length).toBeGreaterThan(0);
    });
  });

  // 18.11 JD-based Project Recommendation & Selection
  describe("18.11 JD-based Project Recommendation and Selection", () => {
    it("should preserve honest project maturity and never inflate non-production scopes", async () => {
      // Insert a prototype project with hackathon maturity
      const [project] = await db
        .insert(bankEntries)
        .values({
          id: `proj_hackathon_${Date.now()}`,
          userId: testUserId,
          entryType: "project",
          title: "AI Voice Assistant Bot",
          descriptionContext: "Created over weekend hackathon with 2 peers",
          visibility: "private",
          verificationStatus: "verified",
          sortOrder: 0,
        })
        .returning();

      // Set user-confirmed maturity metadata
      await ProjectRecommenderService.upsertProjectMetadata(testUserId, project.id, {
        maturityLevel: "functional_prototype",
        actualContribution: "Wrote backend WebSocket server and prompt pipeline",
        implementationGaps: "No mobile app, authentication is mocked",
        limitations: "Single-tenant demo only",
        isProductionReady: false,
      });

      const jdAnalysis: JDAnalysis = {
        schemaVersion: 1,
        role: {
          title: "AI Engineer",
          company: "AI Labs",
          seniority: "mid",
          location: "Remote",
          workMode: "remote",
          yearsExperience: { min: 2, max: 5 },
          domain: ["ai"],
          education: [],
        },
        keywords: [
          {
            id: "kw_ai",
            term: "AI",
            canonical: "ai",
            category: "technical_skill",
            importance: 1.0,
            priority: "must_have",
            evidencePhrase: null,
            userOverride: "none",
            synonyms: [],
            matchStatus: "confirmed",
          } as any,
        ],
        responsibilities: [],
        constraints: [],
        ambiguityFlags: [],
        confidence: 0.9,
        sourceTextHash: "hash",
        promptVersion: "v1",
      };

      const recommendations = await ProjectRecommenderService.recommendProjects(
        testUserId,
        jdAnalysis
      );

      const targetRec = recommendations.find((r) => r.entryId === project.id || r.projectId === project.id);
      expect(targetRec).toBeDefined();
      expect(targetRec?.maturityLevel).toBe("functional_prototype");
      expect(targetRec?.metadata?.isProductionReady).toBe(false);
      expect(targetRec?.metadata?.implementationGaps).toContain("mocked");
      expect(targetRec?.relevanceScore).toBeGreaterThan(0);
    });
  });
});
