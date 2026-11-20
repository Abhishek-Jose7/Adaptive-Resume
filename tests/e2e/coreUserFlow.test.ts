import { describe, it, expect, beforeAll } from "vitest";
import { db, client } from "@/lib/db/client";
import {
  users,
  bankEntries,
  achievementBullets,
  bulletFacts,
  jobs,
  jdAnalyses,
  resumeDocuments,
  resumeVersions,
  applications,
  coverLetters,
  providerCredentials,
  shareLinks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

// Services and engines
import { CompletenessService } from "@/lib/services/completenessService";
import { JDAnalysisService } from "@/lib/services/jdAnalysisService";
import { RelevanceScorer } from "@/lib/tailoring/relevanceScorer";
import { BulletRetriever } from "@/lib/tailoring/bulletRetriever";
import { TruthBoundValidator } from "@/lib/tailoring/truthBoundValidator";
import { MatchScoreEngine } from "@/lib/scoring/matchScoreEngine";
import { ResumeDocStore } from "@/lib/editor/resumeDocStore";
import { AtsLinter } from "@/lib/editor/atsLinter";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { VersionService } from "@/lib/services/versionService";
import { PlainTextSerializer } from "@/lib/export/plainTextSerializer";
import { DocxGenerator } from "@/lib/export/docxGenerator";
import { ApplicationService } from "@/lib/services/applicationService";
import { CoverLetterService } from "@/lib/services/coverLetterService";
import { ShareService } from "@/lib/services/shareService";
import { CredentialService } from "@/lib/services/credentialService";
import { EncryptionService } from "@/lib/crypto/encryption";

import { ResumeDoc } from "@/types/resume";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";

const E2E_USER_ID = `user_e2e_${Date.now()}`;
const E2E_USERNAME = `e2e_user_${Date.now()}`;

describe("Milestone M6: End-to-End User Journey (PRD Section 8.6)", () => {
  beforeAll(async () => {
    // 1. User Registration / Account Setup
    await db
      .insert(users)
      .values({
        id: E2E_USER_ID,
        clerkSubject: `clerk_${E2E_USER_ID}`,
        username: E2E_USERNAME,
        email: `e2e_${Date.now()}@example.com`,
        displayName: "Alex Rivera",
      })
      .onConflictDoNothing();
  });

  it("should complete the full end-to-end workflow from intake to application & deletion", async () => {
    // -------------------------------------------------------------
    // STEP 1: Populate Data Bank with Verified Experiences & Facts
    // -------------------------------------------------------------
    const entryId = `be_e2e_${Date.now()}`;
    await db.insert(bankEntries).values({
      id: entryId,
      userId: E2E_USER_ID,
      entryType: "experience",
      title: "Staff Systems Engineer",
      organization: "CloudScale Inc",
      startDate: "2021-03-01",
      endDate: "2024-01-01",
      isCurrent: false,
      visibility: "public",
      sortOrder: 1,
    });

    const bulletId = `ab_e2e_${Date.now()}`;
    const verifiedBulletText =
      "Architected distributed event pipeline using Rust and Kafka, reducing latency by 45% across 250M daily events.";
    await db.insert(achievementBullets).values({
      id: bulletId,
      userId: E2E_USER_ID,
      entryId,
      text: verifiedBulletText,
      verificationStatus: "verified",
      visibility: "public",
      sortOrder: 1,
    });

    const factId = `bf_e2e_${Date.now()}`;
    await db.insert(bulletFacts).values({
      id: factId,
      userId: E2E_USER_ID,
      bulletId,
      entryId: null,
      factType: "metric",
      factKey: "latency_reduction",
      valueText: "45%",
      valueNumber: 45,
      unit: "percent",
      metricKind: "percent",
      verificationStatus: "verified",
    });

    // Verify completeness audit flags
    const bankAudit = CompletenessService.auditBankEntries([
      {
        id: entryId,
        entryType: "experience",
        title: "Staff Systems Engineer",
        startDate: "2021-03-01",
        bullets: [
          {
            id: bulletId,
            text: verifiedBulletText,
            facts: [{ id: factId, factType: "metric", valueNumber: 45 } as any],
          } as any,
        ],
      } as any,
    ]);
    expect(bankAudit.hasMissingMetrics).toBe(false);
    expect(bankAudit.hasMissingDates).toBe(false);

    // -------------------------------------------------------------
    // STEP 2: Ingest Target Job & Generate Structured Analysis
    // -------------------------------------------------------------
    const targetJobRawText = `
      Title: Staff Infrastructure Architect
      Company: Datadog
      Requirements:
      - 8+ years experience building distributed data systems
      - Deep expertise in Rust, Kafka, and PostgreSQL
      - Proven experience optimizing high-throughput low-latency pipelines
      - B.S. or M.S. in Computer Science
    `;

    const jobId = `job_e2e_${Date.now()}`;
    const jobContentHash = createHash("sha256").update(targetJobRawText).digest("hex");
    await db.insert(jobs).values({
      id: jobId,
      userId: E2E_USER_ID,
      title: "Staff Infrastructure Architect",
      company: "Datadog",
      rawText: targetJobRawText,
      contentHash: jobContentHash,
    });

    const jdAnalysis = JDAnalysisService.analyzeDeterministic(targetJobRawText);
    expect(jdAnalysis.role.seniority).toBe("lead");
    expect(jdAnalysis.keywords.some((k) => k.canonical.toLowerCase().includes("rust"))).toBe(true);

    // -------------------------------------------------------------
    // STEP 3: Relevance Retrieval & Truth-Bound Tailoring Validation
    // -------------------------------------------------------------
    const entryObj: BankEntry = {
      id: entryId,
      userId: E2E_USER_ID,
      entryType: "experience",
      title: "Staff Systems Engineer",
      organization: "CloudScale Inc",
      startDate: "2021-03-01",
      endDate: "2024-01-01",
      isCurrent: false,
      visibility: "public_eligible",
      verificationStatus: "source_verified",
      sortOrder: 1,
      rowVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      bullets: [
        {
          id: bulletId,
          userId: E2E_USER_ID,
          entryId,
          text: verifiedBulletText,
          visibility: "public_eligible",
          verificationStatus: "source_verified",
          usagePolicy: "eligible",
          sortOrder: 1,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          facts: [
            {
              id: factId,
              userId: E2E_USER_ID,
              bulletId,
              entryId: null,
              factType: "metric",
              factKey: "latency_reduction",
              valueText: "45%",
              valueNumber: 45,
              verificationStatus: "source_verified",
              createdAt: new Date(),
            },
          ],
        },
      ],
    };

    const retrieval = BulletRetriever.retrieveCandidates([entryObj], jdAnalysis, 7000);
    expect(retrieval.candidates.length).toBeGreaterThan(0);
    expect(retrieval.candidates[0].scoreBreakdown.totalScore).toBeGreaterThan(40);

    // Truth-Bound Validator (PRD Section 10.4): Enforce zero hallucinations
    const validRewrite = {
      text: "Architected distributed event pipeline using Rust and Kafka, achieving 45% latency reduction across 250M events.",
      sourceBulletIds: [bulletId],
      sourceFactIds: [factId],
      claimMap: [
        {
          claim: "achieving 45% latency reduction",
          evidenceIds: [bulletId, factId],
          claimType: "metric" as const,
        },
      ],
      validatorStatus: "passed" as const,
    };
    const validReport = TruthBoundValidator.validate(
      validRewrite,
      entryObj.bullets!,
      entryObj.bullets![0].facts!,
      [entryObj]
    );
    expect(validReport.isValid).toBe(true);

    const hallucinatedRewrite = {
      text: "Led team of 100 engineers deploying Kubernetes to cut cloud bill by $4,000,000.",
      sourceBulletIds: [bulletId],
      sourceFactIds: [],
      claimMap: [
        {
          claim: "Led team of 100 engineers",
          evidenceIds: [bulletId],
          claimType: "scope" as const,
        },
      ],
      validatorStatus: "passed" as const,
    };
    const invalidReport = TruthBoundValidator.validate(
      hallucinatedRewrite,
      entryObj.bullets!,
      entryObj.bullets![0].facts!,
      [entryObj]
    );
    expect(invalidReport.isValid).toBe(false);
    expect(invalidReport.failures.length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STEP 4: Resume Document Store, ATS Linter & Auto-Fit Ladder
    // -------------------------------------------------------------
    const initialDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "doc_e2e_1",
      versionId: "ver_e2e_1",
      template: { id: "classic-ats", version: "1.0", theme: {} },
      page: { size: "LETTER", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      profile: {
        name: "Alex Rivera",
        fullName: "Alex Rivera",
        headline: "Principal Systems Architect",
        email: "alex@rivera.dev",
        phone: "+1-555-0199",
        location: "San Francisco, CA",
        links: [],
      },
      sections: [],
      experience: [
        {
          id: "exp_1",
          company: "CloudScale Inc",
          position: "Staff Systems Engineer",
          startDate: "2021-03",
          endDate: "2024-01",
          bullets: [
            {
              id: "b_1",
              text: validRewrite.text,
              provenance: "ai-rewrite",
              sourceBulletIds: [bulletId],
              sourceFactIds: [factId],
              validatorStatus: "passed",
            },
          ],
        },
      ],
      skills: [
        { name: "Rust", category: "Languages & Frameworks" },
        { name: "TypeScript", category: "Languages & Frameworks" },
        { name: "PostgreSQL", category: "Languages & Frameworks" },
        { name: "Kafka", category: "Languages & Frameworks" },
      ],
    };

    const store = new ResumeDocStore(initialDoc);
    store.updateProfile({ headline: "Staff Infrastructure Architect" });
    expect(store.getState().doc.profile.headline).toBe("Staff Infrastructure Architect");

    // ATS Linter validation
    const lintResult = AtsLinter.lint(store.getState().doc);
    expect(lintResult.score).toBeGreaterThanOrEqual(80);

    // 8-Step Auto-Fit Ladder evaluation
    const fitStep1 = AutoFitLadder.evaluateFit(store.getState().doc, 1);
    expect(fitStep1.fontSizePt).toBe(10.5);
    const fitStep5 = AutoFitLadder.evaluateFit(store.getState().doc, 5);
    expect(fitStep5.fontSizePt).toBe(9.5);

    // Match Score computation (PRD Section 10.5)
    const matchScore = MatchScoreEngine.calculateScore(store.getState().doc, jdAnalysis, [entryObj]);
    expect(matchScore.totalScore).toBeGreaterThanOrEqual(40);
    expect(Object.keys(matchScore.dimensions).length).toBe(7);

    // -------------------------------------------------------------
    // STEP 5: Resume Document Creation & Version Finalization
    // -------------------------------------------------------------
    const resumeDocId = `res_doc_${Date.now()}`;
    await db.insert(resumeDocuments).values({
      id: resumeDocId,
      userId: E2E_USER_ID,
      title: "Datadog Tailored Resume",
    });

    const v1Id = `ver_e2e_${Date.now()}`;
    await db.insert(resumeVersions).values({
      id: v1Id,
      userId: E2E_USER_ID,
      resumeDocumentId: resumeDocId,
      versionNumber: 1,
      versionKind: "working",
      resumeDocJson: store.getState().doc as any,
      contentHash: "draft_hash",
      templateId: "classic-ats",
    });

    // Finalize version with content hash lock
    const finalized = await VersionService.finalizeVersion(E2E_USER_ID, v1Id);
    expect(finalized.versionKind).toBe("final");
    expect(finalized.immutableAt).toBeInstanceOf(Date);
    expect(finalized.contentHash).toHaveLength(64);

    // -------------------------------------------------------------
    // STEP 6: Multi-Format Document Export (Plaintext, DOCX)
    // -------------------------------------------------------------
    const plainText = PlainTextSerializer.serialize(store.getState().doc);
    expect(plainText).toContain("ALEX RIVERA");
    expect(plainText).toContain("Staff Infrastructure Architect");
    expect(plainText).toContain("Rust");

    const docxBlob = await DocxGenerator.generate(store.getState().doc);
    expect(docxBlob).toBeInstanceOf(Blob);
    expect(docxBlob.size).toBeGreaterThan(1000);

    // -------------------------------------------------------------
    // STEP 7: Application Tracking Pipeline & Stage Transitions
    // -------------------------------------------------------------
    const app = await ApplicationService.createApplication(E2E_USER_ID, {
      jobId,
      resumeVersionId: v1Id,
      status: "Saved",
      notes: "Referral from teammate",
    });
    expect(app.status).toBe("Saved");

    const appliedApp = await ApplicationService.updateApplication(E2E_USER_ID, app.id, {
      status: "Applied",
      appliedAt: new Date().toISOString(),
    });
    expect(appliedApp.status).toBe("Applied");

    // -------------------------------------------------------------
    // STEP 8: Cover Letter Generation (Truth-Grounded)
    // -------------------------------------------------------------
    await db.insert(jdAnalyses).values({
      id: `jda_e2e_${Date.now()}`,
      userId: E2E_USER_ID,
      jobId,
      analysisJson: jdAnalysis as any,
    });

    const coverLetter = await CoverLetterService.generateCoverLetter(E2E_USER_ID, {
      jobId,
      tone: "professional",
    });
    expect(coverLetter.content).toBeDefined();
    expect(coverLetter.content).toContain("Datadog");

    // -------------------------------------------------------------
    // STEP 9: Expiring Share Links & Contact Redaction
    // -------------------------------------------------------------
    const share = await ShareService.createShareLink(E2E_USER_ID, {
      resumeVersionId: v1Id,
      expiresInDays: 14,
      redactContact: true,
      allowDownload: true,
    });
    expect(share.token).toBeDefined();

    const resolvedShare = await ShareService.resolveShareToken(share.token);
    expect(resolvedShare).toBeDefined();
    expect(resolvedShare?.resumeDoc.profile.email).toBe("[Contact via Shared Profile]");
    expect(resolvedShare?.resumeDoc.profile.phone).toBe("[Hidden for Privacy]");

    // -------------------------------------------------------------
    // STEP 10: BYOK Credential Vault (AES-256-GCM Encrypted Storage)
    // -------------------------------------------------------------
    const fakeKey = "gsk_live_test_api_key_123456789";
    const cred = await CredentialService.storeCredential(E2E_USER_ID, "groq", fakeKey);
    expect(cred.last4).toBe("6789");

    const decryptedKey = await CredentialService.getDecryptedKey(E2E_USER_ID, "groq");
    expect(decryptedKey).toBe(fakeKey);

    // -------------------------------------------------------------
    // STEP 11: Account Export & Permanent Deletion
    // -------------------------------------------------------------
    // Check that user records exist before delete
    const preEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, E2E_USER_ID));
    expect(preEntries.length).toBeGreaterThan(0);

    // Cascading purge
    await db.transaction(async (tx) => {
      await tx.delete(shareLinks).where(eq(shareLinks.userId, E2E_USER_ID));
      await tx.delete(providerCredentials).where(eq(providerCredentials.userId, E2E_USER_ID));
      await tx.delete(coverLetters).where(eq(coverLetters.userId, E2E_USER_ID));
      await tx.delete(applications).where(eq(applications.userId, E2E_USER_ID));
      await tx.delete(resumeVersions).where(eq(resumeVersions.userId, E2E_USER_ID));
      await tx.delete(resumeDocuments).where(eq(resumeDocuments.userId, E2E_USER_ID));
      await tx.delete(jdAnalyses).where(eq(jdAnalyses.userId, E2E_USER_ID));
      await tx.delete(jobs).where(eq(jobs.userId, E2E_USER_ID));
      await tx.delete(bulletFacts).where(eq(bulletFacts.userId, E2E_USER_ID));
      await tx.delete(achievementBullets).where(eq(achievementBullets.userId, E2E_USER_ID));
      await tx.delete(bankEntries).where(eq(bankEntries.userId, E2E_USER_ID));
      await tx.delete(users).where(eq(users.id, E2E_USER_ID));
    });

    const postEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, E2E_USER_ID));
    expect(postEntries.length).toBe(0);

    const postUser = await db
      .select()
      .from(users)
      .where(eq(users.id, E2E_USER_ID));
    expect(postUser.length).toBe(0);
  }, 60000);
});
