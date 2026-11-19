import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/clerk";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { escapeHtml } from "@/lib/services/tailoringService";
import { EncryptionService } from "@/lib/crypto/encryption";
import { POST as ocrHandler } from "@/app/api/v1/ocr/route";
import { resetOcrRateLimits } from "@/lib/security/ocrRateLimiter";
import { OcrConsentService } from "@/lib/security/ocrConsentService";
import {
  isPrivateOrReservedIp,
  fetchJobPostingHtml,
  SsrfError,
  createSsrfSafeAgent,
  validateJobPostingUrl,
} from "@/lib/security/ssrfProtection";
import { TruthBoundValidator } from "@/lib/tailoring/truthBoundValidator";
import { ApplicationService } from "@/lib/services/applicationService";
import { CareerGraphService } from "@/lib/services/careerGraphService";
import { ResumeService } from "@/lib/services/resumeService";
import { AchievementBullet, BankEntry, StructuredFact } from "@/types/bank";
import { RewrittenBullet } from "@/types/job";
import { CredentialService } from "@/lib/services/credentialService";
import { db } from "@/lib/db/client";
import { jobs, resumeVersions, applications, resumeDocuments, users, achievementBullets, bankEntries, providerCredentials, auditEvents } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

describe("Phase 1 (P0) Security & Data-Integrity Remediation Regression Suite", () => {
  beforeAll(async () => {
    const userIds = [
      "usr_ocr_sec_test",
      "usr_truth_test",
      "usr_tenant_alice",
      "usr_tenant_bob",
      "usr_resume_zero_fab_test",
    ];
    for (const uid of userIds) {
      await db
        .insert(users)
        .values({
          id: uid,
          clerkSubject: `clerk_${uid}`,
          email: `${uid}@test.com`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }
  });

  // =========================================================================
  // C1: Authentication Bypass & Test Header Spoofing Elimination
  // =========================================================================
  describe("C1: Auth Bypass & Identity Spoofing Mitigation", () => {
    it("MUST throw a critical security error if ENABLE_DEV_AUTH_BYPASS is true in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalBypass = process.env.ENABLE_DEV_AUTH_BYPASS;

      try {
        (process.env as any).NODE_ENV = "production";
        process.env.ENABLE_DEV_AUTH_BYPASS = "true";

        const req = new NextRequest("http://localhost:3000/api/v1/resumes");
        await expect(getAuthUserId(req)).rejects.toThrow(
          /CRITICAL SECURITY VIOLATION: ENABLE_DEV_AUTH_BYPASS is prohibited in production/
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.env.ENABLE_DEV_AUTH_BYPASS = originalBypass;
      }
    });

    it("MUST ignore x-test-user-id and x-test-user-email headers in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalBypass = process.env.ENABLE_DEV_AUTH_BYPASS;

      try {
        (process.env as any).NODE_ENV = "production";
        process.env.ENABLE_DEV_AUTH_BYPASS = "false";

        const req = new NextRequest("http://localhost:3000/api/v1/resumes", {
          headers: {
            "x-test-user-id": "spoofed_attacker_id",
            "x-test-user-email": "spoofed_admin@target.com",
          },
        });

        // In production without Clerk session token, it must reject with UNAUTHENTICATED
        await expect(getAuthUserId(req)).rejects.toThrow(
          /Failed to verify authentication session|Authentication required/
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.env.ENABLE_DEV_AUTH_BYPASS = originalBypass;
      }
    });

    it("MUST reject empty or whitespace email in allowlist check", () => {
      expect(isEmailAllowed("")).toBe(false);
      expect(isEmailAllowed("   ")).toBe(false);
    });
  });

  // =========================================================================
  // C2: Stored XSS Elimination in Tailoring Diff
  // =========================================================================
  describe("C2: Stored XSS Neutralization", () => {
    it("MUST escape all dangerous HTML characters in diff generation", () => {
      const payload = `<script>alert("xss")</script>&<img src=x onerror=alert('xss')>`;
      const escaped = escapeHtml(payload);

      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("</script>");
      expect(escaped).not.toContain("<img");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&amp;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#39;");
    });
  });

  // =========================================================================
  // H1: BYOK Encryption Secret Hard Failure
  // =========================================================================
  describe("H1: Predictable Encryption Secret Elimination", () => {
    it("MUST throw a fatal error in production if ENCRYPTION_SECRET_KEY is missing", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.ENCRYPTION_SECRET_KEY;
      const originalSecret = process.env.ENCRYPTION_SECRET;

      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.ENCRYPTION_SECRET_KEY;
        delete process.env.ENCRYPTION_SECRET;

        expect(() => EncryptionService.encrypt("secret_api_key")).toThrow(
          /CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_SECRET_KEY is required in production/
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.env.ENCRYPTION_SECRET_KEY = originalKey;
        process.env.ENCRYPTION_SECRET = originalSecret;
      }
    });

    it("MUST throw a fatal error in production if default development key is used", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.ENCRYPTION_SECRET_KEY;

      try {
        (process.env as any).NODE_ENV = "production";
        process.env.ENCRYPTION_SECRET_KEY = "default_resume_maker_development_secret_key_32_bytes";

        expect(() => EncryptionService.encrypt("secret_api_key")).toThrow(
          /CRITICAL SECURITY CONFIGURATION ERROR: Insecure or default ENCRYPTION_SECRET_KEY/
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.env.ENCRYPTION_SECRET_KEY = originalKey;
      }
    });

    it("MUST successfully encrypt and decrypt with a valid 32-byte secret", () => {
      const originalKey = process.env.ENCRYPTION_SECRET_KEY;
      try {
        process.env.ENCRYPTION_SECRET_KEY = "a_secure_custom_production_key_32_bytes_long!!";
        const plaintext = "sk-ant-api03-valid-test-key-123456789";
        const encrypted = EncryptionService.encrypt(plaintext);
        expect(encrypted.ciphertext).toBeDefined();
        expect(encrypted.nonce).toBeDefined();
        expect(encrypted.keyVersion).toBe(1);

        const decrypted = EncryptionService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      } finally {
        process.env.ENCRYPTION_SECRET_KEY = originalKey;
      }
    });

    it("MUST decrypt credentials encrypted with previous key version using PREVIOUS_ENCRYPTION_SECRETS", () => {
      const oldSecret = "old_secret_key_from_version_1_32bytes!";
      const newSecret = "new_secret_key_for_version_2_32bytes!";

      const originalKey = process.env.ENCRYPTION_SECRET_KEY;
      const originalVersion = process.env.ENCRYPTION_KEY_VERSION;
      const originalPrevious = process.env.PREVIOUS_ENCRYPTION_SECRETS;

      try {
        // Encrypt with v1 secret
        const plaintext = "sk-groq-gsk_test_api_key_version_1";
        const payloadV1 = EncryptionService.encryptWithSecret(plaintext, oldSecret, 1);

        // Configure system to version 2, keeping v1 in PREVIOUS_ENCRYPTION_SECRETS
        process.env.ENCRYPTION_SECRET_KEY = newSecret;
        process.env.ENCRYPTION_KEY_VERSION = "2";
        process.env.PREVIOUS_ENCRYPTION_SECRETS = `1:${oldSecret}`;

        // Attempt decryption of v1 payload
        const decrypted = EncryptionService.decrypt(payloadV1);
        expect(decrypted).toBe(plaintext);
      } finally {
        process.env.ENCRYPTION_SECRET_KEY = originalKey;
        process.env.ENCRYPTION_KEY_VERSION = originalVersion;
        process.env.PREVIOUS_ENCRYPTION_SECRETS = originalPrevious;
      }
    });

    it("MUST safely rotate credentials via CredentialService.rotateCredentials with audit logging", async () => {
      const testUserId = "usr_ocr_sec_test";
      const initialSecret = "initial_secret_key_32_bytes_long!!";
      const rotatedSecret = "rotated_secret_key_32_bytes_long!!";

      const originalKey = process.env.ENCRYPTION_SECRET_KEY;
      const originalVersion = process.env.ENCRYPTION_KEY_VERSION;
      const originalPrevious = process.env.PREVIOUS_ENCRYPTION_SECRETS;

      try {
        process.env.ENCRYPTION_SECRET_KEY = initialSecret;
        process.env.ENCRYPTION_KEY_VERSION = "1";

        // Store credential with version 1
        const originalApiKey = "gsk_test_api_key_to_be_rotated_1234567";
        const stored = await CredentialService.storeCredential(testUserId, "groq", originalApiKey);
        expect(stored.id).toBeDefined();

        // Configure system so v1 is in PREVIOUS_ENCRYPTION_SECRETS
        process.env.PREVIOUS_ENCRYPTION_SECRETS = `1:${initialSecret}`;

        // Execute rotation to version 2 using rotatedSecret
        const result = await CredentialService.rotateCredentials(2, rotatedSecret, testUserId);
        expect(result.rotatedCount).toBe(1);
        expect(result.failureCount).toBe(0);

        // Verify the credential record was updated to keyVersion 2
        const [updatedCred] = await db
          .select()
          .from(providerCredentials)
          .where(eq(providerCredentials.id, stored.id));
        expect(updatedCred.keyVersion).toBe(2);

        // Decrypt with rotated secret and verify exact plaintext match
        const decryptedKey = EncryptionService.decryptWithSecret(
          {
            ciphertext: updatedCred.encryptedApiKey,
            nonce: updatedCred.keyNonce,
            keyVersion: updatedCred.keyVersion,
          },
          rotatedSecret
        );
        expect(decryptedKey).toBe(originalApiKey);

        // Verify audit event was logged
        const [audit] = await db
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.userId, testUserId),
              eq(auditEvents.action, "byok_key_rotated"),
              eq(auditEvents.resourceId, stored.id)
            )
          );
        expect(audit).toBeDefined();
        expect((audit.metadataJson as any).oldKeyVersion).toBe(1);
        expect((audit.metadataJson as any).newKeyVersion).toBe(2);

        // Clean up
        await db.delete(providerCredentials).where(eq(providerCredentials.id, stored.id));
      } finally {
        process.env.ENCRYPTION_SECRET_KEY = originalKey;
        process.env.ENCRYPTION_KEY_VERSION = originalVersion;
        process.env.PREVIOUS_ENCRYPTION_SECRETS = originalPrevious;
      }
    });
  });

  // =========================================================================
  // H2: Exposed OCR Credentials & Unbounded Processing
  // =========================================================================
  describe("H2: OCR Credential Security & Input Validation", () => {
    beforeEach(async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = "true";
      process.env.DEV_USER_ID = "usr_ocr_sec_test";
      await OcrConsentService.recordConsent("usr_ocr_sec_test");
      await resetOcrRateLimits("usr_ocr_sec_test");
    });

    it("MUST return 503 PROVIDER_UNAVAILABLE when OCR_SPACE_API_KEY is not configured", async () => {
      const originalOcrKey = process.env.OCR_SPACE_API_KEY;
      delete process.env.OCR_SPACE_API_KEY;

      try {
        const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-user-id": "usr_ocr_sec_test",
          },
          body: JSON.stringify({ base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" }),
        });

        const res = await ocrHandler(req);
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.error.code).toBe("PROVIDER_UNAVAILABLE");
      } finally {
        process.env.OCR_SPACE_API_KEY = originalOcrKey;
      }
    });

    it("MUST reject remote URL parameter to prevent open SSRF proxying", async () => {
      process.env.OCR_SPACE_API_KEY = "test_ocr_key";

      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": "usr_ocr_sec_test",
        },
        body: JSON.stringify({
          url: "https://evil-target.internal/metadata",
          userConsent: true,
        }),
      });

      const res = await ocrHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("Direct URL fetching is not supported");
    });

    it("MUST reject OCR processing when explicit user consent is absent (403 CONSENT_REQUIRED)", async () => {
      process.env.OCR_SPACE_API_KEY = "test_ocr_key";
      await OcrConsentService.revokeConsent("usr_ocr_sec_test");
      await resetOcrRateLimits("usr_ocr_sec_test");

      // Request even with forged userConsent in body
      const req = new NextRequest("http://localhost:3000/api/v1/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": "usr_ocr_sec_test",
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

    it("MUST enforce server-side rate limits on OCR requests (429 RATE_LIMIT_EXCEEDED)", async () => {
      process.env.OCR_SPACE_API_KEY = "test_ocr_key";
      await OcrConsentService.recordConsent("usr_ocr_sec_test");
      await resetOcrRateLimits("usr_ocr_sec_test");

      // Mock OCR.space fetch response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          IsErroredOnProcessing: false,
          ParsedResults: [{ ParsedText: "Scanned resume line 1\nScanned resume line 2" }],
        }),
      }) as any;

      try {
        const sendConsentReq = () =>
          new NextRequest("http://localhost:3000/api/v1/ocr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-test-user-id": "usr_ocr_sec_test",
            },
            body: JSON.stringify({
              base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            }),
          });

        // 5 requests should succeed within the limit
        for (let i = 0; i < 5; i++) {
          const res = await ocrHandler(sendConsentReq());
          expect(res.status).toBe(200);
        }

        // 6th request within the same minute window must be rate-limited
        const blockedRes = await ocrHandler(sendConsentReq());
        expect(blockedRes.status).toBe(429);
        const json = await blockedRes.json();
        expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(blockedRes.headers.get("Retry-After")).toBeDefined();
        expect(blockedRes.headers.get("X-RateLimit-Limit")).toBe("5");
      } finally {
        global.fetch = originalFetch;
        await resetOcrRateLimits("usr_ocr_sec_test");
      }
    });
  });

  // =========================================================================
  // H3: SSRF Protection & Manual Redirect Handling
  // =========================================================================
  describe("H3: SSRF Protection & Address Validation", () => {
    it("MUST block all private, loopback, multicast, and translation IPv6 addresses", () => {
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("::")).toBe(true);
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);
      expect(isPrivateOrReservedIp("ff02::1")).toBe(true); // Multicast
      expect(isPrivateOrReservedIp("100::1")).toBe(true); // Discard
      expect(isPrivateOrReservedIp("2001:db8::1")).toBe(true); // Documentation
      expect(isPrivateOrReservedIp("2002:c0a8:0101::")).toBe(true); // 6to4
      expect(isPrivateOrReservedIp("64:ff9b::127.0.0.1")).toBe(true); // NAT64
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true); // IPv4-mapped loopback
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true); // IPv4-mapped metadata
    });

    it("MUST allow valid public internet IPv4 and IPv6 addresses", () => {
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
    });

    it("MUST enforce connection-level IP pinning and block restricted IPs at socket connection time", async () => {
      // Simulate an attempt to pin a socket connection to loopback/private IP
      const blockedAgent = createSsrfSafeAgent("attacker.com", "127.0.0.1");

      await expect(
        fetch("https://attacker.com", {
          // @ts-expect-error undici dispatcher
          dispatcher: blockedAgent,
        })
      ).rejects.toThrow();
    });

    it("MUST reject socket connection if hostname does not match pinned target origin", async () => {
      const mismatchedAgent = createSsrfSafeAgent("careers.validcompany.com", "93.184.216.34");

      try {
        await fetch("https://evil-spoof.com", {
          // @ts-expect-error undici dispatcher
          dispatcher: mismatchedAgent,
        });
        expect.unreachable("Should have thrown error");
      } catch (err: any) {
        expect(err.cause?.message || err.message).toContain("Hostname mismatch");
      }
    });

    it("MUST attach validated pinnedIp to URL upon successful resolution", async () => {
      const result = await validateJobPostingUrl("https://example.com/careers/swe");
      expect(result.pinnedIp).toBeDefined();
      expect(isPrivateOrReservedIp(result.pinnedIp)).toBe(false);
    });
  });

  // =========================================================================
  // H4: Source-Scoped Truth Validation & Experience Isolation
  // =========================================================================
  describe("H4: Source-Scoped Truth Validation & Experience Isolation", () => {
    const entry1: BankEntry = {
      id: "ent_work_1",
      userId: "usr_truth_test",
      entryType: "experience",
      title: "Junior Developer",
      organization: "Acme Labs",
      descriptionContext: "Built basic internal tools using Python.",
      isCurrent: false,
      visibility: "private",
      verificationStatus: "unverified",
      sortOrder: 0,
      rowVersion: 1,
      bullets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const entry2: BankEntry = {
      id: "ent_work_2",
      userId: "usr_truth_test",
      entryType: "experience",
      title: "Senior Infrastructure Engineer",
      organization: "Global Cloud Corp",
      descriptionContext: "Architected Kubernetes clusters handling 50000 req/s.",
      isCurrent: false,
      visibility: "private",
      verificationStatus: "unverified",
      sortOrder: 1,
      rowVersion: 1,
      bullets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bullet1: AchievementBullet = {
      id: "b_ent1_1",
      userId: "usr_truth_test",
      entryId: "ent_work_1",
      text: "Created internal dashboard using Python and SQLite.",
      sortOrder: 0,
      rowVersion: 1,
      visibility: "private",
      verificationStatus: "unverified",
      usagePolicy: "eligible",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bullet2: AchievementBullet = {
      id: "b_ent2_1",
      userId: "usr_truth_test",
      entryId: "ent_work_2",
      text: "Scaled microservices to 50000 req/s with 99.99% availability.",
      sortOrder: 0,
      rowVersion: 1,
      visibility: "private",
      verificationStatus: "unverified",
      usagePolicy: "eligible",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("MUST reject rewritten bullet citing a bullet ID from an unrelated experience", () => {
      const contaminatedRewrite: RewrittenBullet = {
        text: "Created internal dashboard handling 50000 req/s.",
        sourceBulletIds: ["b_ent2_1"], // Citing bullet belonging to entry2 while tailoring entry1!
        sourceFactIds: [],
        claimMap: [
          { claim: "Created dashboard", evidenceIds: ["b_ent2_1"], claimType: "action" },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(
        contaminatedRewrite,
        [bullet1, bullet2],
        [],
        [entry1],
        "ent_work_1" // Target is entry1!
      );

      expect(result.isValid).toBe(false);
      const crossExpFailure = result.failures.find(
        (f) => f.rule === "CROSS_EXPERIENCE_CONTAMINATION"
      );
      expect(crossExpFailure).toBeDefined();
      expect(crossExpFailure?.message).toContain("Experience isolation forbids");
    });

    it("MUST not allow vocabulary from unrelated entry descriptions to ground scope in target entry", () => {
      // Entry 2 has "Kubernetes", Entry 1 does NOT have "Kubernetes"
      const ungroundedRewrite: RewrittenBullet = {
        text: "Created internal dashboard using Kubernetes and Python.",
        sourceBulletIds: ["b_ent1_1"],
        sourceFactIds: [],
        claimMap: [
          { claim: "Used Kubernetes", evidenceIds: ["b_ent1_1"], claimType: "tool" },
        ],
        validatorStatus: "passed",
      };

      // Even if entry2 is present in the full user profile, target entry is entry1
      const result = TruthBoundValidator.validate(
        ungroundedRewrite,
        [bullet1],
        [],
        [entry1, entry2],
        "ent_work_1"
      );

      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "UNGROUNDED_ENTITY")).toBe(true);
    });

    // Adversarial Test: Cites valid bullet from Entry 1, but incorporates foreign metric from Entry 2
    it("ADVERSARIAL: MUST reject bullet citing Entry 1 evidence but smuggling Entry 2 metric (50000 req/s)", () => {
      const metricSmugglingRewrite: RewrittenBullet = {
        text: "Created internal dashboard using Python handling 50000 req/s.",
        sourceBulletIds: ["b_ent1_1"], // Cites valid Entry 1 bullet
        sourceFactIds: [],
        claimMap: [
          { claim: "Created internal dashboard", evidenceIds: ["b_ent1_1"], claimType: "action" },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(
        metricSmugglingRewrite,
        [bullet1],
        [],
        [entry1],
        "ent_work_1"
      );

      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "NUMERIC_MUTATION")).toBe(true);
    });

    // Adversarial Test: Cites valid bullet from Entry 1, but smuggles ungrounded date/year
    it("ADVERSARIAL: MUST reject bullet inventing ungrounded dates (e.g. 2024)", () => {
      const dateHallucinationRewrite: RewrittenBullet = {
        text: "Created internal dashboard using Python in 2024.",
        sourceBulletIds: ["b_ent1_1"],
        sourceFactIds: [],
        claimMap: [
          { claim: "Created internal dashboard in 2024", evidenceIds: ["b_ent1_1"], claimType: "date" },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(
        dateHallucinationRewrite,
        [bullet1],
        [],
        [entry1],
        "ent_work_1"
      );

      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "NUMERIC_MUTATION")).toBe(true);
    });

    // Adversarial Test: Verb promotion from assistive to leadership without justification
    it("ADVERSARIAL: MUST reject unjustified leadership verb promotion from assisted to led", () => {
      const assistiveBullet: AchievementBullet = {
        id: "b_assist_1",
        userId: "usr_truth_test",
        entryId: "ent_work_1",
        text: "Assisted senior engineers with internal dashboard development in Python.",
        sortOrder: 0,
        rowVersion: 1,
        visibility: "private",
        verificationStatus: "unverified",
        usagePolicy: "eligible",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const promotedRewrite: RewrittenBullet = {
        text: "Led internal dashboard development using Python.",
        sourceBulletIds: ["b_assist_1"],
        sourceFactIds: [],
        claimMap: [
          { claim: "Led internal dashboard development", evidenceIds: ["b_assist_1"], claimType: "action" },
        ],
        validatorStatus: "passed",
      };

      const result = TruthBoundValidator.validate(
        promotedRewrite,
        [assistiveBullet],
        [],
        [entry1],
        "ent_work_1"
      );

      expect(result.isValid).toBe(false);
      expect(result.failures.some((f) => f.rule === "VERB_PROMOTION")).toBe(true);
    });
  });

  // =========================================================================
  // H5: Cross-Tenant Database Relationships & IDOR Isolation
  // =========================================================================
  describe("H5: Cross-Tenant Database Relationships & IDOR Isolation", () => {
    const tenantA = "usr_tenant_alice";
    const tenantB = "usr_tenant_bob";

    it("MUST reject creating an application referencing another tenant's job", async () => {
      // Seed a job for tenant B
      const bobJobId = `job_bob_${Date.now()}`;
      await db.insert(jobs).values({
        id: bobJobId,
        userId: tenantB,
        title: "Confidential Staff Role",
        company: "Bob's Secret Corp",
        rawText: "Secret JD contents",
        contentHash: `hash_bob_${Date.now()}`,
      });

      // Tenant A attempts to create an application referencing Bob's job
      await expect(
        ApplicationService.createApplication(tenantA, {
          jobId: bobJobId,
          status: "Saved",
        })
      ).rejects.toThrow(/Referenced job not found or access denied/);

      // Clean up
      await db.delete(jobs).where(eq(jobs.id, bobJobId));
    });

    it("MUST reject adding an interview to another tenant's application", async () => {
      // Seed an application for tenant B
      const bobAppId = `app_bob_${Date.now()}`;
      await db.insert(applications).values({
        id: bobAppId,
        userId: tenantB,
        status: "Saved",
      });

      // Tenant A attempts to add an interview to Bob's application
      await expect(
        ApplicationService.addInterview(tenantA, bobAppId, {
          roundName: "Technical Interview",
        })
      ).rejects.toThrow(/Application not found or access denied/);

      // Clean up
      await db.delete(applications).where(eq(applications.id, bobAppId));
    });

    it("ADVERSARIAL: MUST reject CareerGraphService.addEdge when sourceId belongs to another tenant", async () => {
      // Seed a bullet for tenant B
      const bobEntryId = `ent_bob_${Date.now()}`;
      await db.insert(bankEntries).values({
        id: bobEntryId,
        userId: tenantB,
        entryType: "experience",
        title: "Bob's Work",
      });

      const bobBulletId = `b_bob_${Date.now()}`;
      await db.insert(achievementBullets).values({
        id: bobBulletId,
        userId: tenantB,
        entryId: bobEntryId,
        text: "Bob's confidential infrastructure achievement",
      });

      // Tenant A attempts to link an edge from Bob's bullet to a skill
      await expect(
        CareerGraphService.addEdge(tenantA, {
          sourceType: "achievement_bullet",
          sourceId: bobBulletId,
          targetType: "skill",
          targetId: "kubernetes",
          relationshipType: "used_skill",
        })
      ).rejects.toThrow(/Source achievement bullet not found or access denied/);

      // Clean up
      await db.delete(achievementBullets).where(eq(achievementBullets.id, bobBulletId));
      await db.delete(bankEntries).where(eq(bankEntries.id, bobEntryId));
    });

    it("POSTGRES ENGINE CONSTRAINT: MUST reject direct SQL insert linking Alice's application to Bob's job with error 23503", async () => {
      const bobJobId = `job_bob_sql_${Date.now()}`;
      await db.insert(jobs).values({
        id: bobJobId,
        userId: tenantB,
        title: "Bob's Secret Job",
        company: "Bob's Secret Corp",
        rawText: "Secret JD contents",
        contentHash: `hash_bob_sql_${Date.now()}`,
      });

      const aliceAppId = `app_alice_idor_${Date.now()}`;
      try {
        let caughtError: any = null;
        try {
          await db.insert(applications).values({
            id: aliceAppId,
            userId: tenantA, // Alice's user_id
            jobId: bobJobId, // Bob's job_id!
            status: "Saved",
          });
        } catch (err: any) {
          caughtError = err;
        }

        expect(caughtError).toBeDefined();
        // Check for PostgreSQL foreign key violation error code 23503 or constraint name
        const isFkViolation =
          caughtError.code === "23503" ||
          caughtError.message?.includes("applications_user_job_fk") ||
          caughtError.message?.includes("foreign key constraint");
        expect(isFkViolation).toBe(true);
      } finally {
        await db.delete(applications).where(eq(applications.id, aliceAppId));
        await db.delete(jobs).where(eq(jobs.id, bobJobId));
      }
    });

    it("POSTGRES ENGINE CONSTRAINT: MUST reject direct SQL insert linking Alice's bullet to Bob's bank entry with error 23503", async () => {
      const bobEntryId = `ent_bob_sql_${Date.now()}`;
      await db.insert(bankEntries).values({
        id: bobEntryId,
        userId: tenantB,
        entryType: "experience",
        title: "Bob's Secret Project",
      });

      const aliceBulletId = `b_alice_idor_${Date.now()}`;
      try {
        let caughtError: any = null;
        try {
          await db.insert(achievementBullets).values({
            id: aliceBulletId,
            userId: tenantA, // Alice
            entryId: bobEntryId, // Bob's entry!
            text: "Alice tries to attach bullet to Bob's entry",
          });
        } catch (err: any) {
          caughtError = err;
        }

        expect(caughtError).toBeDefined();
        const isFkViolation =
          caughtError.code === "23503" ||
          caughtError.message?.includes("achievement_bullets_user_entry_fk") ||
          caughtError.message?.includes("foreign key constraint");
        expect(isFkViolation).toBe(true);
      } finally {
        await db.delete(achievementBullets).where(eq(achievementBullets.id, aliceBulletId));
        await db.delete(bankEntries).where(eq(bankEntries.id, bobEntryId));
      }
    });
  });

  // =========================================================================
  // H6: Fabricated Default Resume Claims Elimination
  // =========================================================================
  describe("H6: Default Resume Grounding & Zero Fabrication", () => {
    it("MUST initialize newly created resumes with blank summary, headline, and contact fields", async () => {
      const testUserId = "usr_resume_zero_fab_test";
      const resume = await ResumeService.createResume(testUserId, "Clean Baseline Resume");

      const doc = resume.document;
      expect(doc.profile.summary).toBe("");
      expect(doc.profile.summary).not.toContain("Results-driven professional");
      expect(doc.profile.headline).toBe("");
      expect(doc.profile.email).toBe("");
      expect(doc.profile.phone).toBe("");
      expect(doc.profile.location).toBe("");

      // Clean up
      await db.delete(resumeVersions).where(eq(resumeVersions.resumeDocumentId, resume.id));
      await db.delete(resumeDocuments).where(eq(resumeDocuments.id, resume.id));
    });
  });

  // =========================================================================
  // H9: Migration Error Handling & Journal Tracking
  // =========================================================================
  describe("H9: Migration Journal & Error Resilience", () => {
    it("MUST verify that _migrations_journal exists and contains baseline migration files", async () => {
      const rows = await db.execute<{ file_name: string }>(
        sql`SELECT file_name FROM _migrations_journal ORDER BY file_name;`
      );

      const rowsArr = Array.isArray(rows) ? rows : (rows as any).rows || [];
      const executedFiles = rowsArr.map((r: any) => r.file_name);
      expect(executedFiles).toContain("0000_even_shadowcat.sql");
      expect(executedFiles).toContain("0001_sleepy_mimic.sql");
    });
  });
});
