import { describe, it, expect } from "vitest";
import { TruthBoundValidator } from "@/lib/tailoring/truthBoundValidator";
import { RelevanceScorer } from "@/lib/tailoring/relevanceScorer";
import { BulletRetriever } from "@/lib/tailoring/bulletRetriever";
import { MatchScoreEngine } from "@/lib/scoring/matchScoreEngine";
import { GapReportEngine } from "@/lib/scoring/gapReportEngine";
import { AchievementBullet, BankEntry, StructuredFact } from "@/types/bank";
import { JDAnalysis, RewrittenBullet } from "@/types/job";
import { ResumeDoc } from "@/types/resume";

describe("Milestone M3: Golden Set & Tailoring Engine Verification", () => {
  // Test Fixtures
  const sampleEntry: BankEntry = {
    id: "entry-1",
    userId: "test-user",
    entryType: "experience",
    organization: "Acme Corp",
    title: "Senior Software Engineer",
    startDate: "2022-01-01",
    endDate: null,
    isCurrent: true,
    descriptionContext: "Built web applications and internal tools for customer support. React, TypeScript, Node.js, PostgreSQL",
    visibility: "resume",
    verificationStatus: "user_verified",
    sortOrder: 1,
    rowVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bullets: [],
  };

  const sampleBullet1: AchievementBullet = {
    id: "bullet-1",
    entryId: "entry-1",
    userId: "test-user",
    text: "Engineered real-time analytics pipeline using Node.js and PostgreSQL, reducing latency by 40%.",
    visibility: "resume",
    verificationStatus: "user_verified",
    usagePolicy: "eligible",
    sortOrder: 1,
    rowVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    facts: [
      {
        id: "fact-1",
        bulletId: "bullet-1",
        userId: "test-user",
        factKey: "latency_reduction",
        factType: "metric",
        valueNumeric: 40,
        unit: "%",
        valueText: "40%",
        contextSnippet: "latency reduction",
        confidence: 1.0,
        verificationStatus: "user_verified",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const sampleBullet2: AchievementBullet = {
    id: "bullet-2",
    entryId: "entry-1",
    userId: "test-user",
    text: "Contributed to internal dashboard using React and Flask, helping support staff resolve tickets.",
    visibility: "resume",
    verificationStatus: "user_verified",
    usagePolicy: "eligible",
    sortOrder: 2,
    rowVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    facts: [],
  };

  const sampleJDAnalysis: JDAnalysis = {
    schemaVersion: 1,
    role: {
      title: "Senior Backend Engineer",
      company: "Tech Giant",
      seniority: "senior",
      domain: ["Fintech", "Data Infrastructure"],
      location: "San Francisco, CA",
      workMode: "remote",
      yearsExperience: { min: 5, max: null },
      education: ["B.S. Computer Science"],
    },
    keywords: [
      {
        id: "kw-1",
        canonical: "PostgreSQL",
        synonyms: ["Postgres"],
        category: "tool",
        priority: "must_have",
        importance: 0.9,
        evidencePhrase: "Deep knowledge of PostgreSQL",
        userOverride: "none",
      },
      {
        id: "kw-2",
        canonical: "Node.js",
        synonyms: ["Node"],
        category: "tool",
        priority: "must_have",
        importance: 0.85,
        evidencePhrase: "Production Node.js services",
        userOverride: "none",
      },
      {
        id: "kw-3",
        canonical: "Kubernetes",
        synonyms: ["K8s"],
        category: "tool",
        priority: "must_have",
        importance: 0.9,
        evidencePhrase: "Kubernetes container orchestration",
        userOverride: "none",
      },
      {
        id: "kw-4",
        canonical: "GraphQL",
        synonyms: [],
        category: "tool",
        priority: "nice_to_have",
        importance: 0.6,
        evidencePhrase: "Experience with GraphQL APIs",
        userOverride: "none",
      },
    ],
    responsibilities: [
      {
        id: "resp-1",
        text: "Design high throughput backend data services with low latency.",
        priority: "must_have",
        keywords: ["backend", "data", "latency"],
      },
      {
        id: "resp-2",
        text: "Collaborate across cross-functional product engineering teams.",
        priority: "nice_to_have",
        keywords: ["cross-functional", "collaboration"],
      },
    ],
    constraints: [],
    ambiguityFlags: [],
    confidence: 0.92,
    sourceTextHash: "sample-hash",
    promptVersion: "v1.0",
  };

  // Group 1: PRD Section 10.4 Negative Example Check
  describe("PRD 10.4 Canonical Negative Example", () => {
    it("MUST reject 'Developed scalable enterprise-grade applications' when source is 'Developed a dashboard using React and Flask'", () => {
      const source: AchievementBullet = {
        id: "b-react-flask",
        entryId: "entry-1",
        userId: "test-user",
        text: "Developed a dashboard using React and Flask.",
        visibility: "resume",
        verificationStatus: "user_verified",
        usagePolicy: "eligible",
        sortOrder: 1,
        rowVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        facts: [],
      };

      const rewrite: RewrittenBullet = {
        text: "Developed scalable enterprise-grade applications using React and Flask.",
        sourceBulletIds: [source.id],
        sourceFactIds: [],
        claimMap: [
          {
            claim: "Developed scalable enterprise-grade applications",
            evidenceIds: [source.id],
            claimType: "scope",
          },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [source], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "UNGROUNDED_SCOPE")).toBe(true);
      expect(result.feedbackForRetry).toContain("enterprise");
    });
  });

  // Group 2: Numeric Claim Grounding & Mutation Tests
  describe("Numeric Claim Grounding (PRD 10.4 Rule 2)", () => {
    it("passes when numeric metric matches source exactly (40%)", () => {
      const rewrite: RewrittenBullet = {
        text: "Engineered Node.js and PostgreSQL analytics pipeline, cutting response latency by 40%.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: ["fact-1"],
        claimMap: [
          { claim: "latency cut by 40%", evidenceIds: [sampleBullet1.id, "fact-1"], claimType: "metric" },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], sampleBullet1.facts || [], [sampleEntry]);
      expect(result.isValid).toBe(true);
    });

    it("rejects hallucinated percentage ('45%' when source has '40%')", () => {
      const rewrite: RewrittenBullet = {
        text: "Optimized pipeline in Node.js and PostgreSQL to cut latency by 45%.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: ["fact-1"],
        claimMap: [{ claim: "cut latency by 45%", evidenceIds: [sampleBullet1.id], claimType: "metric" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], sampleBullet1.facts || [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "NUMERIC_MUTATION" && f.offendingToken?.includes("45"))).toBe(true);
    });

    it("rejects invented multiplier ('3x' when not present in source)", () => {
      const rewrite: RewrittenBullet = {
        text: "Accelerated analytics processing by 3x using Node.js.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: [],
        claimMap: [{ claim: "accelerated by 3x", evidenceIds: [sampleBullet1.id], claimType: "metric" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "NUMERIC_MUTATION")).toBe(true);
    });

    it("rejects invented currency figures ('$100k' when not in source)", () => {
      const rewrite: RewrittenBullet = {
        text: "Built analytics pipeline saving $100k in server infrastructure costs.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: [],
        claimMap: [{ claim: "saving $100k", evidenceIds: [sampleBullet1.id], claimType: "metric" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "NUMERIC_MUTATION")).toBe(true);
    });
  });

  // Group 3: Scope & Verb Promotion Tests
  describe("Scope & Verb Promotion (PRD 10.4 Rule 4)", () => {
    it("rejects verb promotion from 'contributed to' / 'helping' to 'architected' or 'led'", () => {
      const rewrite: RewrittenBullet = {
        text: "Architected internal support dashboard using React and Flask.",
        sourceBulletIds: [sampleBullet2.id],
        sourceFactIds: [],
        claimMap: [{ claim: "Architected dashboard", evidenceIds: [sampleBullet2.id], claimType: "action" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet2], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(
        result.failures.some((f) => f.rule === "VERB_PROMOTION" || f.rule === "UNGROUNDED_SCOPE")
      ).toBe(true);
    });

    it("rejects scope expansion to 'production-scale' without evidence", () => {
      const rewrite: RewrittenBullet = {
        text: "Delivered production-scale web analytics services with Node.js.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: [],
        claimMap: [{ claim: "production-scale", evidenceIds: [sampleBullet1.id], claimType: "scope" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "UNGROUNDED_SCOPE")).toBe(true);
    });
  });

  // Group 4: Entity & Technology Grounding
  describe("Entity Grounding (PRD 10.4 Rule 3 & Rule 8)", () => {
    it("rejects injecting JD must-have technology ('Kubernetes') when candidate has no record of it", () => {
      const rewrite: RewrittenBullet = {
        text: "Deployed real-time analytics pipeline using Node.js, PostgreSQL, and Kubernetes.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: [],
        claimMap: [{ claim: "deployed on Kubernetes", evidenceIds: [sampleBullet1.id], claimType: "tool" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "UNGROUNDED_ENTITY" && f.offendingToken === "kubernetes")).toBe(true);
    });
  });

  // Group 5: Schema & Claim Mapping Validation
  describe("Schema & Claim Mapping (PRD 10.4 Rule 1 & Rule 5)", () => {
    it("rejects rewrite referencing non-existent bullet ID", () => {
      const rewrite: RewrittenBullet = {
        text: "Engineered analytics pipeline.",
        sourceBulletIds: ["non-existent-id"],
        sourceFactIds: [],
        claimMap: [{ claim: "Engineered pipeline", evidenceIds: ["non-existent-id"], claimType: "action" }],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "SCHEMA_MISMATCH")).toBe(true);
    });

    it("rejects rewrite with missing claimMap", () => {
      const rewrite: RewrittenBullet = {
        text: "Engineered analytics pipeline reducing latency by 40%.",
        sourceBulletIds: [sampleBullet1.id],
        sourceFactIds: [],
        claimMap: [],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(rewrite, [sampleBullet1], sampleBullet1.facts || [], [sampleEntry]);
      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "MISSING_CLAIM_COVERAGE")).toBe(true);
    });
  });

  // Group 6: Relevance Scoring Formula (PRD 10.2)
  describe("Bullet Relevance Scoring Formula", () => {
    it("scores higher for must-have keyword matches (PostgreSQL, Node.js)", () => {
      const score1 = RelevanceScorer.scoreBullet(sampleBullet1, sampleEntry, sampleJDAnalysis);
      const score2 = RelevanceScorer.scoreBullet(sampleBullet2, sampleEntry, sampleJDAnalysis);

      expect(score1.mustHaveScore).toBeGreaterThan(0);
      expect(score1.totalScore).toBeGreaterThan(score2.totalScore);
    });

    it("respects exclusion override policy ('never_use' yields score 0)", () => {
      const excludedBullet: AchievementBullet = {
        ...sampleBullet1,
        usagePolicy: "never_use",
      };
      const score = RelevanceScorer.scoreBullet(excludedBullet, sampleEntry, sampleJDAnalysis);
      expect(score.totalScore).toBe(0);
      expect(score.isExcluded).toBe(true);
    });
  });

  // Group 7: Bullet Retrieval & Token Budgeting (PRD 10.3)
  describe("Bullet Retrieval & Token Budget", () => {
    it("retrieves candidates and respects token budget limit", () => {
      const fullEntry = { ...sampleEntry, bullets: [sampleBullet1, sampleBullet2] };
      const retrieval = BulletRetriever.retrieveCandidates([fullEntry], sampleJDAnalysis, 7000);

      expect(retrieval.candidates.length).toBeGreaterThan(0);
      expect(retrieval.estimatedTokens).toBeLessThanOrEqual(7000);
      expect(retrieval.candidates[0].bullet.id).toBe(sampleBullet1.id); // Highest relevance first
    });
  });

  // Group 8: Resume-JD Match Score Engine (PRD 10.5)
  describe("Resume-JD Match Score Engine", () => {
    it("calculates 0-100 score with 7 dimension breakdown", () => {
      const sampleResume: ResumeDoc = {
        schemaVersion: 1,
        documentId: "doc-1",
        versionId: "ver-1",
        sections: [],
        template: { id: "classic-ats", version: "1.0", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        profile: {
          name: "Alex Rivera",
          fullName: "Alex Rivera",
          email: "alex@example.com",
          phone: "+1 555-0192",
          location: "San Francisco, CA",
          links: [],
          headline: "Senior Software Engineer",
          summary: "Experienced backend engineer building services with Node.js and PostgreSQL.",
        },
        experience: [
          {
            id: "exp-1",
            company: "Acme Corp",
            position: "Senior Software Engineer",
            startDate: "2022-01-01",
            endDate: null,
            location: "Remote",
            bullets: [
              {
                id: sampleBullet1.id,
                text: sampleBullet1.text,
                provenance: "bank",
                sourceBulletIds: [sampleBullet1.id],
                sourceFactIds: [],
                validatorStatus: "passed",
              },
            ],
          },
        ],
        education: [],
        skills: [{ name: "PostgreSQL", category: "Database" }, { name: "Node.js", category: "Backend" }],
        projects: [],
        certifications: [],
      };

      const result = MatchScoreEngine.calculateScore(sampleResume, sampleJDAnalysis, [sampleEntry]);
      expect(result.isAvailable).toBe(true);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.dimensions.mustHaveKeywords.covered).toContain("PostgreSQL");
      expect(result.dimensions.mustHaveKeywords.missing).toContain("Kubernetes");
    });

    it("reports 'Score unavailable' when confidence is low (<0.3)", () => {
      const lowConfidenceJD: JDAnalysis = {
        ...sampleJDAnalysis,
        confidence: 0.2,
      };

      const result = MatchScoreEngine.calculateScore({} as any, lowConfidenceJD, []);
      expect(result.isAvailable).toBe(false);
      expect(result.unavailableReason).toContain("Score unavailable");
    });
  });

  // Group 9: Gap Report Engine (PRD 10.4 & 10.5)
  describe("Gap Report Engine", () => {
    it("categorizes missing keywords into In Bank, In Profile Unverified, and Missing From Bank", () => {
      // Create a resume missing PostgreSQL and Kubernetes
      const resumeWithoutDb: ResumeDoc = {
        schemaVersion: 1,
        documentId: "doc-2",
        versionId: "ver-2",
        sections: [],
        template: { id: "classic-ats", version: "1.0", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        profile: {
          name: "Alex",
          fullName: "Alex",
          email: "alex@example.com",
          phone: undefined,
          location: undefined,
          links: [],
          headline: undefined,
          summary: undefined,
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      };

      const fullEntry = { ...sampleEntry, bullets: [sampleBullet1] };
      const gapReport = GapReportEngine.generateReport(resumeWithoutDb, sampleJDAnalysis, [fullEntry]);

      // PostgreSQL is in Bank (sampleBullet1) but not on resume
      const inBank = gapReport.inBankNotOnResume.find((g) => g.keyword.canonical === "PostgreSQL");
      expect(inBank).toBeDefined();
      expect(inBank?.suggestedBullets?.length).toBeGreaterThan(0);

      // Kubernetes is not in Data Bank at all
      const missingFromBank = gapReport.missingFromBank.find((g) => g.keyword.canonical === "Kubernetes");
      expect(missingFromBank).toBeDefined();
      expect(missingFromBank?.uiLabel).toBe("Not in your Data Bank — add only if true");
    });
  });

  // Group 10: Exhaustive Restricted Scope Term Injections (PRD 10.4 Rule 4)
  describe("Exhaustive Scope Term Checks", () => {
    const scopeTerms = [
      "enterprise",
      "production-scale",
      "global",
      "high-availability",
      "mission-critical",
      "secure",
      "scalable",
      "architected",
      "owned",
      "led",
      "spearheaded",
      "directed",
      "optimized",
      "increased",
    ];

    for (const term of scopeTerms) {
      it(`strictly rejects ungrounded injection of scope term "${term}"`, () => {
        const rewrite: RewrittenBullet = {
          text: `Delivered a ${term} solution using React.`,
          sourceBulletIds: [sampleBullet2.id],
          sourceFactIds: [],
          claimMap: [{ claim: `Delivered a ${term} solution`, evidenceIds: [sampleBullet2.id], claimType: "scope" }],
          validatorStatus: "passed",
        };

        const result = TruthBoundValidator.validate(rewrite, [sampleBullet2], [], [sampleEntry]);
        expect(result.isValid).toBe(false);
        expect(result.failures.some((f) => f.rule === "UNGROUNDED_SCOPE" || f.rule === "VERB_PROMOTION")).toBe(true);
      });
    }
  });

  // Group 11: Exhaustive Assistive Verb Promotions
  describe("Exhaustive Assistive Verb Promotions", () => {
    const assistivePhrases = [
      "Assisted senior engineers on the internal dashboard.",
      "Helped QA team run integration tests.",
      "Contributed to internal dashboard using React.",
      "Supported product managers with weekly metrics.",
      "Participated in daily standup discussions.",
      "Worked on minor bug fixes in backend codebase.",
    ];

    for (const phrase of assistivePhrases) {
      it(`rejects promotion of "${phrase}" to leadership verb "led"`, () => {
        const source: AchievementBullet = {
          id: "b-assistive",
          entryId: "entry-1",
          userId: "test-user",
          text: phrase,
          visibility: "resume",
          verificationStatus: "user_verified",
          usagePolicy: "eligible",
          sortOrder: 1,
          rowVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          facts: [],
        };

        const rewrite: RewrittenBullet = {
          text: "Led the engineering initiative for internal dashboard.",
          sourceBulletIds: [source.id],
          sourceFactIds: [],
          claimMap: [{ claim: "Led engineering initiative", evidenceIds: [source.id], claimType: "action" }],
          validatorStatus: "passed",
        };

        const result = TruthBoundValidator.validate(rewrite, [source], [], [sampleEntry]);
        expect(result.isValid).toBe(false);
        expect(result.failures.some((f) => f.rule === "VERB_PROMOTION" || f.rule === "UNGROUNDED_SCOPE")).toBe(true);
      });
    }
  });
});

