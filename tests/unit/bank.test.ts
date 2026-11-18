import { describe, it, expect, beforeAll } from "vitest";
import { CompletenessService } from "../../src/lib/services/completenessService";
import { DuplicateDetectionService } from "../../src/lib/services/duplicateDetectionService";
import { BankRepository } from "../../src/lib/repositories/bankRepository";
import { BankEntry } from "../../src/types/bank";

import { db } from "../../src/lib/db/client";
import { users } from "../../src/lib/db/schema";

describe("Milestone M1: Data Bank Auditing & Repository", () => {
  const testUserId = `test_user_${Date.now()}`;

  beforeAll(async () => {
    await db.insert(users).values({
      id: testUserId,
      clerkSubject: `clerk_${testUserId}`,
      username: `user_${testUserId}`,
      email: `${testUserId}@example.com`,
    });
  });

  describe("CompletenessService", () => {
    it("should flag bullets without metrics and pass bullets with metrics", () => {
      const mockEntries: BankEntry[] = [
        {
          id: "e1",
          userId: "u1",
          entryType: "experience",
          title: "Senior Engineer",
          organization: "TechCorp",
          startDate: "2022-01-01",
          isCurrent: true,
          visibility: "private",
          verificationStatus: "unverified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [
            {
              id: "b1",
              userId: "u1",
              entryId: "e1",
              text: "Worked on frontend features with team",
              visibility: "private",
              verificationStatus: "unverified",
              usagePolicy: "eligible",
              sortOrder: 0,
              rowVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              facts: [], // No metric fact, no numbers in text -> flagged!
            },
            {
              id: "b2",
              userId: "u1",
              entryId: "e1",
              text: "Reduced page load time by 35% through query caching",
              visibility: "private",
              verificationStatus: "unverified",
              usagePolicy: "eligible",
              sortOrder: 1,
              rowVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              facts: [
                {
                  id: "f1",
                  userId: "u1",
                  bulletId: "b2",
                  factType: "metric",
                  factKey: "latency_reduction",
                  valueText: "35%",
                  valueNumber: 35,
                  unit: "%",
                  metricKind: "percent",
                  verificationStatus: "unverified",
                  createdAt: new Date(),
                },
              ],
            },
          ],
        },
      ];

      const report = CompletenessService.auditBankEntries(mockEntries);
      expect(report.hasMissingMetrics).toBe(true);
      expect(report.missingMetricBulletIds).toContain("b1");
      expect(report.missingMetricBulletIds).not.toContain("b2");
      expect(report.hasMissingDates).toBe(false);
    });

    it("should flag experience entries missing start dates", () => {
      const mockEntries: BankEntry[] = [
        {
          id: "e2",
          userId: "u1",
          entryType: "experience",
          title: "Backend Dev",
          organization: "Acme",
          startDate: null, // Missing date!
          isCurrent: false,
          visibility: "private",
          verificationStatus: "unverified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [],
        },
      ];

      const report = CompletenessService.auditBankEntries(mockEntries);
      expect(report.hasMissingDates).toBe(true);
      expect(report.missingDateEntryIds).toContain("e2");
    });
  });

  describe("DuplicateDetectionService", () => {
    it("should detect duplicate entries with matching title and organization", () => {
      const mockEntries: BankEntry[] = [
        {
          id: "e1",
          userId: "u1",
          entryType: "experience",
          title: "Software Engineer",
          organization: "Google",
          isCurrent: true,
          visibility: "private",
          verificationStatus: "unverified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "e2",
          userId: "u1",
          entryType: "experience",
          title: "software engineer", // same
          organization: "google", // same
          isCurrent: true,
          visibility: "private",
          verificationStatus: "unverified",
          sortOrder: 1,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { duplicateEntries } = DuplicateDetectionService.findDuplicates(mockEntries);
      expect(duplicateEntries.length).toBeGreaterThan(0);
      expect(duplicateEntries[0].primaryId).toBe("e1");
      expect(duplicateEntries[0].duplicateId).toBe("e2");
    });

    it("should detect near-identical bullets using lexical similarity", () => {
      const mockEntries: BankEntry[] = [
        {
          id: "e1",
          userId: "u1",
          entryType: "experience",
          title: "Lead",
          organization: "Org1",
          isCurrent: true,
          visibility: "private",
          verificationStatus: "unverified",
          sortOrder: 0,
          rowVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          bullets: [
            {
              id: "b1",
              userId: "u1",
              entryId: "e1",
              text: "Architected and deployed microservices backend using TypeScript and Docker",
              visibility: "private",
              verificationStatus: "unverified",
              usagePolicy: "eligible",
              sortOrder: 0,
              rowVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "b2",
              userId: "u1",
              entryId: "e1",
              text: "Architected and deployed a microservices backend using TypeScript and Docker",
              visibility: "private",
              verificationStatus: "unverified",
              usagePolicy: "eligible",
              sortOrder: 1,
              rowVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ];

      const { duplicateBullets } = DuplicateDetectionService.findDuplicates(mockEntries);
      expect(duplicateBullets.length).toBeGreaterThan(0);
      expect(duplicateBullets[0].similarityScore).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("BankRepository Database Operations", () => {
    let entryId: string;
    let bulletId: string;

    it("should create a new bank entry and atomic bullet with facts", async () => {
      entryId = await BankRepository.createEntry(testUserId, {
        entryType: "experience",
        title: "Staff Platform Engineer",
        organization: "Neon Cloud Systems",
        location: "Remote",
        startDate: "2023-01-01",
        isCurrent: true,
        descriptionContext: "Managed multi-region PostgreSQL clusters and query routing",
      });

      expect(entryId).toBeDefined();

      bulletId = await BankRepository.createBullet(testUserId, entryId, {
        text: "Scaled PostgreSQL throughput by 4x handling 50k QPS with sub-10ms latency",
        facts: [
          {
            factType: "metric",
            factKey: "throughput_increase",
            valueText: "4x",
            valueNumber: 4,
            unit: "x",
            metricKind: "scale",
          },
          {
            factType: "metric",
            factKey: "qps",
            valueText: "50,000 QPS",
            valueNumber: 50000,
            unit: "QPS",
            metricKind: "count",
          },
          {
            factType: "tool",
            factKey: "database",
            valueText: "PostgreSQL",
          },
        ],
      });

      expect(bulletId).toBeDefined();
    });

    it("should read entry by ID with attached bullets and typed facts without N+1 queries", async () => {
      const entry = await BankRepository.getEntryById(testUserId, entryId);
      expect(entry).not.toBeNull();
      expect(entry!.title).toBe("Staff Platform Engineer");
      expect(entry!.bullets).toHaveLength(1);
      expect(entry!.bullets![0].id).toBe(bulletId);
      expect(entry!.bullets![0].facts).toHaveLength(3);

      const metricFact = entry!.bullets![0].facts!.find((f) => f.factKey === "qps");
      expect(metricFact).toBeDefined();
      expect(metricFact!.valueNumber).toBe(50000);
    });

    it("should enforce optimistic concurrency version checks on entry updates", async () => {
      const entry = await BankRepository.getEntryById(testUserId, entryId);
      const currentVersion = entry!.rowVersion;

      // Update with correct version
      const success = await BankRepository.updateEntry(testUserId, entryId, currentVersion, {
        title: "Principal Platform Engineer",
      });
      expect(success).toBe(true);

      const updated = await BankRepository.getEntryById(testUserId, entryId);
      expect(updated!.title).toBe("Principal Platform Engineer");
      expect(updated!.rowVersion).toBe(currentVersion + 1);

      // Attempting to update with old version should detect conflict
      const staleAttempt = await BankRepository.updateEntry(testUserId, entryId, currentVersion, {
        title: "Conflicting Update",
      });
      // The update should match 0 rows
      const afterStale = await BankRepository.getEntryById(testUserId, entryId);
      expect(afterStale!.title).toBe("Principal Platform Engineer"); // unchanged
    });

    it("should perform full-text search using search_vector", async () => {
      const searchResult = await BankRepository.listEntries(testUserId, {
        searchQuery: "PostgreSQL",
      });

      expect(searchResult.items.length).toBeGreaterThan(0);
      expect(searchResult.items[0].id).toBe(entryId);
    });

    it("should soft delete an entry and verify it is excluded from list queries", async () => {
      await BankRepository.softDeleteEntry(testUserId, entryId);

      const listAfterDelete = await BankRepository.listEntries(testUserId);
      expect(listAfterDelete.items.find((i) => i.id === entryId)).toBeUndefined();

      // Verify undo / restore
      await BankRepository.restoreEntry(testUserId, entryId);
      const listAfterRestore = await BankRepository.listEntries(testUserId);
      expect(listAfterRestore.items.find((i) => i.id === entryId)).toBeDefined();
    });
  });
});
