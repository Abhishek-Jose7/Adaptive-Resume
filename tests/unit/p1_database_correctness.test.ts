import { describe, it, expect, beforeAll, vi } from "vitest";
import { db } from "@/lib/db/client";
import {
  users,
  userUsageQuotas,
  resumeDocuments,
  resumeVersions,
  jobs,
  applications,
  coverLetters,
  userOcrConsents,
  ocrRateLimits,
} from "@/lib/db/schema";
import { UsageLimitService } from "@/lib/services/usageLimitService";
import { ResumeService } from "@/lib/services/resumeService";
import { OcrConsentService, CURRENT_OCR_POLICY_VERSION } from "@/lib/security/ocrConsentService";
import { checkAndConsumeOcrRateLimit, resetOcrRateLimits } from "@/lib/security/ocrRateLimiter";
import { POST as ocrHandler } from "@/app/api/v1/ocr/route";
import { PATCH as resumePatchHandler } from "@/app/api/v1/resumes/[id]/route";
import { validateJobPostingUrl, isPrivateOrReservedIp } from "@/lib/security/ssrfProtection";
import { EncryptionService, FORBIDDEN_DEFAULT_SECRETS } from "@/lib/crypto/encryption";
import { eq, and, sql } from "drizzle-orm";
import { ResumeDoc } from "@/types/resume";
import { NextRequest } from "next/server";

describe("Phase 2 (P1) Database Correctness Test Suite", () => {
  const testUserId = "usr_p1_correctness_tester";
  const crossTenantUserId = "usr_p1_cross_tenant_tester";

  beforeAll(async () => {
    process.env.ENABLE_DEV_AUTH_BYPASS = "true";
    process.env.DEV_USER_ID = testUserId;

    for (const uid of [testUserId, crossTenantUserId]) {
      await db
        .insert(users)
        .values({
          id: uid,
          clerkSubject: `clerk_sub_${uid}`,
          email: `${uid}@example.com`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: { updatedAt: new Date() },
        });
    }
  });

  // =========================================================================
  // 1. Persistent OCR Consent & Distributed Serverless Rate Limiting
  // =========================================================================
  describe("1. Persistent OCR Consent & Distributed Serverless Rate Limiting", () => {
    it("MUST reject OCR processing when user consent is absent or revoked in database (403)", async () => {
      process.env.OCR_SPACE_API_KEY = "test_ocr_key";
      await OcrConsentService.revokeConsent(testUserId);
      await resetOcrRateLimits(testUserId);

      // Caller attempts to supply userConsent: true in body
      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": testUserId,
        },
        body: JSON.stringify({
          base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          userConsent: true,
        }),
      });

      const res = await ocrHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("CONSENT_REQUIRED");
      expect(json.error.message).toContain("Explicit user consent is required");
    });

    it("MUST reject OCR processing when consent record is bound to an outdated policy version (403)", async () => {
      process.env.OCR_SPACE_API_KEY = "test_ocr_key";
      // Record consent with an outdated policy version
      await OcrConsentService.recordConsent(testUserId, "2024-01-01");
      await resetOcrRateLimits(testUserId);

      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": testUserId,
        },
        body: JSON.stringify({
          base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        }),
      });

      const res = await ocrHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("CONSENT_REQUIRED");
      expect(json.error.message).toContain("OCR privacy policy has been updated");
    });

    it("MUST enforce distributed atomic rate limits across concurrent serverless instances (5/min, 25/day)", async () => {
      // Grant active consent
      await OcrConsentService.recordConsent(testUserId, CURRENT_OCR_POLICY_VERSION);
      await resetOcrRateLimits(testUserId);

      // Simulate 10 simultaneous serverless requests in parallel hitting PostgreSQL
      const results = await Promise.all(
        Array.from({ length: 10 }, () => checkAndConsumeOcrRateLimit(testUserId))
      );

      const allowedCount = results.filter((r) => r.allowed).length;
      const rejectedCount = results.filter((r) => !r.allowed).length;

      // Exactly 5 allowed (minute window limit), exactly 5 rejected with 429
      expect(allowedCount).toBe(5);
      expect(rejectedCount).toBe(5);

      const rejectedResult = results.find((r) => !r.allowed);
      expect(rejectedResult?.limit).toBe(5);
      expect(rejectedResult?.remaining).toBe(0);
      expect(rejectedResult?.error).toContain("Maximum 5 requests per minute allowed");
    });
  });

  // =========================================================================
  // 2. Composite Foreign Keys & Column-Targeted ON DELETE SET NULL
  // =========================================================================
  describe("2. Composite Foreign Keys & Column-Targeted ON DELETE SET NULL", () => {
    it("MUST set job_id to NULL on child tables when parent job is deleted, preserving user_id", async () => {
      const jobId = `job_composite_${Date.now()}`;
      const docId = `doc_composite_${Date.now()}`;
      const appId = `app_composite_${Date.now()}`;
      const coverId = `cov_composite_${Date.now()}`;

      // 1. Insert parent job
      await db.insert(jobs).values({
        id: jobId,
        userId: testUserId,
        title: "Staff Systems Architect",
        company: "Acme Cloud Corp",
        rawText: "Job description text",
        contentHash: `hash_${jobId}`,
      });

      // 2. Insert child records referencing job
      await db.insert(resumeDocuments).values({
        id: docId,
        userId: testUserId,
        jobId,
        title: "Tailored Resume",
      });

      await db.insert(applications).values({
        id: appId,
        userId: testUserId,
        jobId,
        status: "Saved",
      });

      await db.insert(coverLetters).values({
        id: coverId,
        userId: testUserId,
        jobId,
        title: "Cover Letter for Staff Architect",
        content: "Dear Hiring Team...",
      });

      // 3. Delete parent job
      await db.delete(jobs).where(and(eq(jobs.userId, testUserId), eq(jobs.id, jobId)));

      // 4. Verify all child records still exist with intact user_id and job_id = NULL
      const [doc] = await db.select().from(resumeDocuments).where(eq(resumeDocuments.id, docId));
      expect(doc).toBeDefined();
      expect(doc.userId).toBe(testUserId);
      expect(doc.jobId).toBeNull();

      const [app] = await db.select().from(applications).where(eq(applications.id, appId));
      expect(app).toBeDefined();
      expect(app.userId).toBe(testUserId);
      expect(app.jobId).toBeNull();

      const [cover] = await db.select().from(coverLetters).where(eq(coverLetters.id, coverId));
      expect(cover).toBeDefined();
      expect(cover.userId).toBe(testUserId);
      expect(cover.jobId).toBeNull();

      // Clean up
      await db.delete(coverLetters).where(eq(coverLetters.id, coverId));
      await db.delete(applications).where(eq(applications.id, appId));
      await db.delete(resumeDocuments).where(eq(resumeDocuments.id, docId));
    });

    it("MUST strictly reject cross-tenant composite foreign key references at PostgreSQL schema level", async () => {
      const bobJobId = `job_bob_${Date.now()}`;
      const aliceDocId = `doc_alice_${Date.now()}`;

      // Insert Bob's job
      await db.insert(jobs).values({
        id: bobJobId,
        userId: crossTenantUserId,
        title: "Cross Tenant Role",
        rawText: "Description",
        contentHash: `hash_${bobJobId}`,
      });

      try {
        // Attempt to insert Alice's resume referencing Bob's job directly in SQL
        // Composite FK (user_id, job_id) REFERENCES jobs(user_id, id) MUST reject this
        await expect(
          db.execute(sql`
            INSERT INTO resume_documents (id, user_id, job_id, title)
            VALUES (${aliceDocId}, ${testUserId}, ${bobJobId}, 'Malicious Cross-Tenant Resume');
          `)
        ).rejects.toThrow(/violates foreign key constraint|resume_documents_user_job_fk/);
      } finally {
        await db.delete(jobs).where(eq(jobs.id, bobJobId));
      }
    });
  });

  // =========================================================================
  // 3. Atomic Quota Enforcement & Boundary Reservation
  // =========================================================================
  describe("3. Atomic Quota Enforcement & Boundary Reservation", () => {
    it("MUST atomically enforce AI generation boundary (50 limit) under parallel concurrent calls", async () => {
      const currentPeriod = new Date().toISOString().slice(0, 7);

      // Seed quota at 49 (exactly 1 slot remaining)
      await db
        .insert(userUsageQuotas)
        .values({
          id: `quota_${testUserId}_${currentPeriod}`,
          userId: testUserId,
          monthlyPeriod: currentPeriod,
          aiGenerationsCount: 49,
          exportsGeneratedCount: 0,
          aiTokensConsumed: 0,
        })
        .onConflictDoUpdate({
          target: [userUsageQuotas.userId, userUsageQuotas.monthlyPeriod],
          set: { aiGenerationsCount: 49 },
        });

      // Launch 5 parallel reservation attempts simultaneously
      const results = await Promise.all(
        Array.from({ length: 5 }, () => UsageLimitService.checkAndReserveAiGeneration(testUserId))
      );

      const reservedCount = results.filter((r) => r.reserved).length;
      const rejectedCount = results.filter((r) => !r.reserved).length;

      // Exactly 1 must succeed, exactly 4 must fail
      expect(reservedCount).toBe(1);
      expect(rejectedCount).toBe(4);

      // Verify counter in database never exceeded 50
      const [finalQuota] = await db
        .select()
        .from(userUsageQuotas)
        .where(
          and(
            eq(userUsageQuotas.userId, testUserId),
            eq(userUsageQuotas.monthlyPeriod, currentPeriod)
          )
        );
      expect(finalQuota.aiGenerationsCount).toBe(50);

      // Test refund: refundAiGeneration decrements back to 49
      await UsageLimitService.refundAiGeneration(testUserId);
      const [refundedQuota] = await db
        .select()
        .from(userUsageQuotas)
        .where(
          and(
            eq(userUsageQuotas.userId, testUserId),
            eq(userUsageQuotas.monthlyPeriod, currentPeriod)
          )
        );
      expect(refundedQuota.aiGenerationsCount).toBe(49);
    });

    it("MUST atomically enforce export quota boundary (20 limit) under parallel concurrent calls", async () => {
      const currentPeriod = new Date().toISOString().slice(0, 7);

      // Seed quota at 19 (exactly 1 slot remaining)
      await db
        .insert(userUsageQuotas)
        .values({
          id: `quota_${testUserId}_${currentPeriod}`,
          userId: testUserId,
          monthlyPeriod: currentPeriod,
          aiGenerationsCount: 0,
          exportsGeneratedCount: 19,
          aiTokensConsumed: 0,
        })
        .onConflictDoUpdate({
          target: [userUsageQuotas.userId, userUsageQuotas.monthlyPeriod],
          set: { exportsGeneratedCount: 19 },
        });

      // Launch 5 parallel export consumption attempts simultaneously
      const results = await Promise.all(
        Array.from({ length: 5 }, () => UsageLimitService.checkAndConsumeExportQuota(testUserId))
      );

      const allowedCount = results.filter((r) => r.allowed).length;
      const rejectedCount = results.filter((r) => !r.allowed).length;

      // Exactly 1 must succeed, exactly 4 must fail
      expect(allowedCount).toBe(1);
      expect(rejectedCount).toBe(4);

      // Verify counter in database never exceeded 20
      const [finalQuota] = await db
        .select()
        .from(userUsageQuotas)
        .where(
          and(
            eq(userUsageQuotas.userId, testUserId),
            eq(userUsageQuotas.monthlyPeriod, currentPeriod)
          )
        );
      expect(finalQuota.exportsGeneratedCount).toBe(20);

      // Test refund: refundExportQuota decrements back to 19
      await UsageLimitService.refundExportQuota(testUserId);
      const [refundedQuota] = await db
        .select()
        .from(userUsageQuotas)
        .where(
          and(
            eq(userUsageQuotas.userId, testUserId),
            eq(userUsageQuotas.monthlyPeriod, currentPeriod)
          )
        );
      expect(refundedQuota.exportsGeneratedCount).toBe(19);
    });
  });

  // =========================================================================
  // 4. Mandatory Autosave Concurrency Control
  // =========================================================================
  describe("4. Mandatory Autosave Concurrency Control", () => {
    it("MUST reject autosave with HTTP 400 when rowVersion is missing or non-positive", async () => {
      const resume = await ResumeService.createResume(testUserId, "Mandatory Version Test Resume");

      try {
        const dummyDoc: ResumeDoc = {
          ...resume.document,
          profile: { ...resume.document.profile, summary: "New summary." },
        };

        // Service level: throws INVALID_ROW_VERSION
        await expect(
          ResumeService.autosaveDraft(testUserId, resume.id, dummyDoc, undefined as any)
        ).rejects.toThrow(/INVALID_ROW_VERSION/);

        await expect(
          ResumeService.autosaveDraft(testUserId, resume.id, dummyDoc, 0)
        ).rejects.toThrow(/INVALID_ROW_VERSION/);

        // API route level: returns HTTP 400 VALIDATION_ERROR
        const req = new NextRequest(`http://localhost:3000/api/v1/resumes/${resume.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-test-user-id": testUserId,
          },
          body: JSON.stringify({
            document: dummyDoc,
            // rowVersion intentionally omitted
          }),
        });

        const res = await resumePatchHandler(req, { params: Promise.resolve({ id: resume.id }) });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.message).toContain("rowVersion (positive integer) is mandatory");
      } finally {
        await db.delete(resumeVersions).where(eq(resumeVersions.resumeDocumentId, resume.id));
        await db.delete(resumeDocuments).where(eq(resumeDocuments.id, resume.id));
      }
    });

    it("MUST reject concurrent autosave with HTTP 409 when expectedRowVersion is stale", async () => {
      const resume = await ResumeService.createResume(testUserId, "Stale Concurrency Test Resume");

      try {
        const full = await ResumeService.getResume(testUserId, resume.id);
        const initialRowVersion = full!.latestVersion!.rowVersion;

        const doc1 = { ...resume.document, profile: { ...resume.document.profile, summary: "Save 1" } };
        const doc2 = { ...resume.document, profile: { ...resume.document.profile, summary: "Save 2" } };

        // Save 1 succeeds
        await ResumeService.autosaveDraft(testUserId, resume.id, doc1, initialRowVersion);

        // Save 2 with old rowVersion throws 409
        const req = new NextRequest(`http://localhost:3000/api/v1/resumes/${resume.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-test-user-id": testUserId,
          },
          body: JSON.stringify({
            document: doc2,
            rowVersion: initialRowVersion,
          }),
        });

        const res = await resumePatchHandler(req, { params: Promise.resolve({ id: resume.id }) });
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.error.code).toBe("CONCURRENCY_CONFLICT");
      } finally {
        await db.delete(resumeVersions).where(eq(resumeVersions.resumeDocumentId, resume.id));
        await db.delete(resumeDocuments).where(eq(resumeDocuments.id, resume.id));
      }
    });
  });

  // =========================================================================
  // 5. SSRF Port Restriction & Hex IPv6 Address Normalization
  // =========================================================================
  describe("5. SSRF Port Restriction & Hex IPv6 Normalization", () => {
    it("MUST reject non-443 ports for outbound fetch", async () => {
      const forbiddenPorts = ["https://example.com:8443/job", "https://example.com:8080/job", "https://example.com:3000/job"];
      for (const url of forbiddenPorts) {
        await expect(validateJobPostingUrl(url)).rejects.toThrow(
          /Port \d+ is not permitted for job URL fetching. Only port 443 is allowed./
        );
      }
    });

    it("MUST normalize and detect all IPv4-mapped and IPv4-compatible hex IPv6 addresses", () => {
      // Loopback 127.0.0.1 in hex notation
      expect(isPrivateOrReservedIp("::ffff:7f00:1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:7f00:0001")).toBe(true);
      expect(isPrivateOrReservedIp("0:0:0:0:0:ffff:7f00:1")).toBe(true);
      // Private 10.0.0.1 in hex notation
      expect(isPrivateOrReservedIp("::ffff:a00:1")).toBe(true);
      expect(isPrivateOrReservedIp("0:0:0:0:0:ffff:a00:1")).toBe(true);
      // IPv4-compatible loopback
      expect(isPrivateOrReservedIp("::7f00:1")).toBe(true);
    });
  });

  // =========================================================================
  // 6. Cryptographic Secret Validation & Rotation Preflight
  // =========================================================================
  describe("6. Cryptographic Secret Validation & Rotation Preflight", () => {
    it("MUST reject secrets shorter than 32 characters in encryptWithSecret", () => {
      expect(() =>
        EncryptionService.encryptWithSecret("payload", "short_secret_under_32_bytes")
      ).toThrow(/Secret key must be at least 32 characters long/);
    });

    it("MUST reject known forbidden default secrets directly in encryptWithSecret", () => {
      for (const forbidden of FORBIDDEN_DEFAULT_SECRETS) {
        expect(() =>
          EncryptionService.encryptWithSecret("payload", forbidden)
        ).toThrow(/Insecure or forbidden default secret key/);
      }
    });
  });
});
