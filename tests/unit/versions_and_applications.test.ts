import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { VersionService } from "@/lib/services/versionService";
import { ApplicationService } from "@/lib/services/applicationService";
import { CoverLetterService } from "@/lib/services/coverLetterService";
import { db } from "@/lib/db/client";
import {
  users,
  resumeDocuments,
  resumeVersions,
  jobs,
  jdAnalyses,
  bankEntries,
  achievementBullets,
  bulletFacts,
  applications,
  coverLetters,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ResumeDoc } from "@/types/resume";

const TEST_USER = "user_test_m5_" + Date.now();
const ANOTHER_USER = "user_test_m5_other_" + Date.now();

describe("Milestone M5: Resume Versions, Application Tracking & Cover Letters", () => {
  beforeEach(async () => {
    // Ensure test user exists in local database
    await db
      .insert(users)
      .values({
        id: TEST_USER,
        clerkSubject: `clerk_${TEST_USER}`,
        username: `user_${TEST_USER}`,
        email: `test_m5_${Date.now()}@example.com`,
        displayName: "M5 Test User",
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: ANOTHER_USER,
        clerkSubject: `clerk_${ANOTHER_USER}`,
        username: `user_${ANOTHER_USER}`,
        email: `test_other_${Date.now()}@example.com`,
        displayName: "Other User",
      })
      .onConflictDoNothing();
  });

  describe("Resume Versioning & Immutability (PRD Section 9.2 & 10.1)", () => {
    it("should finalize a working version with SHA-256 hash and immutable timestamp", async () => {
      // 1. Create a parent resume document
      const resumeId = `res_${Date.now()}`;
      await db.insert(resumeDocuments).values({
        id: resumeId,
        userId: TEST_USER,
        title: "Senior Staff Engineer Resume",
      });

      // 2. Insert a working version
      const versionId = `ver_${Date.now()}`;
      const sampleDoc: ResumeDoc = {
        schemaVersion: 1,
        documentId: resumeId,
        versionId,
        template: { id: "classic-ats", version: "1.0", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        profile: {
          name: "M5 Test User",
          fullName: "M5 Test User",
          headline: "Distributed Systems Architect",
          email: "test@example.com",
          links: [],
        },
        sections: [],
        experience: [
          {
            id: "exp_1",
            position: "Principal Engineer",
            company: "Acme Cloud",
            startDate: "2021-01",
            bullets: [
              {
                id: "b_1",
                text: "Reduced p99 tail latency by 45% using Rust microservices.",
                provenance: "bank",
                sourceBulletIds: ["b_1"],
                sourceFactIds: [],
                validatorStatus: "passed",
              },
            ],
          },
        ],
      };

      await db.insert(resumeVersions).values({
        id: versionId,
        userId: TEST_USER,
        resumeDocumentId: resumeId,
        versionNumber: 1,
        versionKind: "working",
        resumeDocJson: sampleDoc as any,
        contentHash: "draft-hash",
      });

      // 3. Finalize the version
      const finalized = await VersionService.finalizeVersion(TEST_USER, versionId);

      expect(finalized).toBeDefined();
      expect(finalized.versionKind).toBe("final");
      expect(finalized.immutableAt).toBeInstanceOf(Date);
      expect(finalized.finalizedAt).toBeInstanceOf(Date);

      // Verify SHA-256 hash (64 hex characters, matches content of stored document)
      expect(finalized.contentHash).toHaveLength(64);
      const computedHash = createHash("sha256")
        .update(JSON.stringify(finalized.resumeDocJson))
        .digest("hex");
      expect(finalized.contentHash).toBe(computedHash);
    });

    it("should restore/branch a working version from a finalized snapshot", async () => {
      const resumeId = `res_restore_${Date.now()}`;
      await db.insert(resumeDocuments).values({
        id: resumeId,
        userId: TEST_USER,
        title: "Version Branching Test",
      });

      const v1Id = `ver_v1_${Date.now()}`;
      const sampleDoc: ResumeDoc = {
        schemaVersion: 1,
        documentId: resumeId,
        versionId: v1Id,
        template: { id: "classic-ats", version: "1.0", theme: {} },
        page: { size: "LETTER", targetPages: 1 },
        metadata: { createdAt: new Date().toISOString() },
        profile: {
          name: "M5 Test User",
          fullName: "M5 Test User",
          email: "test@example.com",
          links: [],
        },
        sections: [],
      };

      await db.insert(resumeVersions).values({
        id: v1Id,
        userId: TEST_USER,
        resumeDocumentId: resumeId,
        versionNumber: 1,
        versionKind: "final",
        resumeDocJson: sampleDoc as any,
        contentHash: "hash_v1",
        immutableAt: new Date(),
      });

      // Restore/branch from v1
      const restored = await VersionService.restoreVersion(TEST_USER, v1Id);

      expect(restored).toBeDefined();
      expect(restored.parentVersionId).toBe(v1Id);
      expect(restored.versionNumber).toBe(2);
      expect(restored.versionKind).toBe("working");
      expect(restored.immutableAt).toBeNull();
      expect(restored.resumeDocumentId).toBe(resumeId);
    });
  });

  describe("Application Tracking Pipeline (PRD Section 7.5 & 8.6)", () => {
    it("should create, transition stages, and list job applications", async () => {
      // 1. Create a job record
      const jobId = `job_app_${Date.now()}`;
      const rawText = "Lead payment gateway scaling";
      await db.insert(jobs).values({
        id: jobId,
        userId: TEST_USER,
        company: "Stripe",
        title: "Staff Infrastructure Engineer",
        rawText,
        contentHash: createHash("sha256").update(rawText).digest("hex"),
      });

      // 2. Track application in 'Saved' status
      const createdApp = await ApplicationService.createApplication(TEST_USER, {
        jobId,
        status: "Saved",
        notes: "Targeting Q2 pipeline",
      });

      expect(createdApp.status).toBe("Saved");
      expect(createdApp.jobId).toBe(jobId);

      // 3. Transition to 'Applied' with date
      const appliedDate = new Date().toISOString();
      const updatedApp = await ApplicationService.updateApplication(TEST_USER, createdApp.id, {
        status: "Applied",
        appliedAt: appliedDate,
        notes: "Applied via referral",
      });

      expect(updatedApp.status).toBe("Applied");
      expect(updatedApp.appliedAt).toBeInstanceOf(Date);
      expect(updatedApp.notes).toBe("Applied via referral");

      // 4. Transition to 'Interview'
      const interviewedApp = await ApplicationService.updateApplication(TEST_USER, createdApp.id, {
        status: "Interview",
      });
      expect(interviewedApp.status).toBe("Interview");

      // 5. Query applications for user
      const list = await ApplicationService.listApplications(TEST_USER);
      expect(list.length).toBeGreaterThan(0);
      const found = list.find((a) => a.id === createdApp.id);
      expect(found).toBeDefined();
      expect(found?.jobTitle).toBe("Staff Infrastructure Engineer");
      expect(found?.jobCompany).toBe("Stripe");

      // 6. Tenant isolation: Other user should not see this application
      const otherList = await ApplicationService.listApplications(ANOTHER_USER);
      expect(otherList.some((a) => a.id === createdApp.id)).toBe(false);

      // 7. Cleanup
      const deleted = await ApplicationService.deleteApplication(TEST_USER, createdApp.id);
      expect(deleted).toBe(true);
    });
  });

  describe("Cover Letter Service & Truth Grounding (PRD Section 10.4 & 11.2)", () => {
    it("should generate a truth-grounded cover letter strictly using Data Bank bullets", async () => {
      // 1. Create a Job and JD Analysis
      const jobId = `job_cl_${Date.now()}`;
      const rawText = "Deploying low latency edge services with Rust and TypeScript";
      await db.insert(jobs).values({
        id: jobId,
        userId: TEST_USER,
        company: "Cloudflare",
        title: "Principal Edge Systems Engineer",
        rawText,
        contentHash: createHash("sha256").update(rawText).digest("hex"),
      });

      await db.insert(jdAnalyses).values({
        id: `jda_${Date.now()}`,
        userId: TEST_USER,
        jobId,
        analysisJson: {
          schemaVersion: 1,
          role: {
            title: "Principal Edge Systems Engineer",
            company: "Cloudflare",
            seniority: "senior",
            domain: ["Distributed Systems", "Cloud Infrastructure"],
            location: "Remote",
            workMode: "remote",
            yearsExperience: { min: 8, max: null },
            education: ["Computer Science"],
          },
          keywords: [
            {
              id: "k1",
              canonical: "Rust",
              synonyms: [],
              category: "technical_skill",
              priority: "must_have",
              importance: 1.0,
              evidencePhrase: "Rust systems",
              userOverride: "none",
            },
            {
              id: "k2",
              canonical: "TypeScript",
              synonyms: [],
              category: "technical_skill",
              priority: "nice_to_have",
              importance: 0.8,
              evidencePhrase: "TypeScript runtime",
              userOverride: "none",
            },
          ],
          responsibilities: [
            {
              id: "r1",
              text: "Design globally distributed edge worker runtimes.",
              priority: "must_have",
              keywords: ["Rust"],
            },
          ],
          constraints: [],
          ambiguityFlags: [],
          confidence: 0.95,
          sourceTextHash: "hash_123",
          promptVersion: "1.0.0",
        } as any,
      });

      // 2. Insert verified Bank Entry and Bullet
      const entryId = `entry_cl_${Date.now()}`;
      await db.insert(bankEntries).values({
        id: entryId,
        userId: TEST_USER,
        entryType: "experience",
        title: "Staff Systems Engineer",
        organization: "Vercel",
        startDate: "2022-01-01",
      });

      const bulletId = `bullet_cl_${Date.now()}`;
      const bulletText =
        "Architected Rust edge proxy processing 1.2M requests/sec with 8ms response time.";
      await db.insert(achievementBullets).values({
        id: bulletId,
        userId: TEST_USER,
        entryId,
        text: bulletText,
        verificationStatus: "verified",
      });

      // 3. Generate cover letter
      const cl = await CoverLetterService.generateCoverLetter(TEST_USER, {
        jobId,
        tone: "professional",
      });

      expect(cl).toBeDefined();
      expect(cl.content).toBeDefined();
      expect(cl.jobId).toBe(jobId);
      expect(cl.tone).toBe("professional");

      // Verify that candidate bullet text is incorporated into the content
      expect(cl.content).toContain(bulletText);

      // Verify single retrieval and update
      const fetched = await CoverLetterService.getCoverLetter(TEST_USER, cl.id);
      expect(fetched).toBeDefined();
      expect(fetched?.title).toContain("Cloudflare");

      // Update tone and content
      const updated = await CoverLetterService.updateCoverLetter(TEST_USER, cl.id, {
        tone: "concise",
        title: "Updated Title for Cloudflare",
      });
      expect(updated.tone).toBe("concise");
      expect(updated.title).toBe("Updated Title for Cloudflare");

      // Delete
      const deleted = await CoverLetterService.deleteCoverLetter(TEST_USER, cl.id);
      expect(deleted).toBe(true);
    });
  });
});
