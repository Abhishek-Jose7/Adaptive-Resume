import { db } from "@/lib/db/client";
import {
  aiRuns,
  achievementBullets,
  bankEntries,
  bulletFacts,
  jdAnalyses,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ResumeService } from "./resumeService";
import { BankRepository } from "@/lib/repositories/bankRepository";
import { XyzRewriterService } from "@/lib/ai/services/xyzRewriterService";
import { JDAnalysis } from "@/types/job";
import { StructuredFact } from "@/types/bank";
import { diffWords } from "diff";
import crypto from "crypto";

export interface ExtractedMetricFact {
  factType: "metric";
  factKey: string;
  valueText: string;
  valueNumber: number | null;
  unit: string | null;
  metricKind: "percent" | "currency" | "duration" | "scale" | "count";
}

/**
 * Extracts deterministic metric facts from a user-edited bullet so newly added metrics
 * become queryable structured facts when backported to Career Vault.
 */
export function extractMetricFactsFromText(text: string): ExtractedMetricFact[] {
  const results: ExtractedMetricFact[] = [];
  const seen = new Set<string>();

  const patterns: Array<{
    regex: RegExp;
    kind: ExtractedMetricFact["metricKind"];
    keyPrefix: string;
  }> = [
    { regex: /(\d+(?:\.\d+)?)\s*(%)/g, kind: "percent", keyPrefix: "pct" },
    { regex: /([$€£₹]\s*\d+(?:,\d{3})*(?:\.\d+)?\s*[kKmMbB]?)/g, kind: "currency", keyPrefix: "rev" },
    {
      regex: /(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|seconds|min|mins|minutes|hr|hrs|hours|days|weeks|x)\b/gi,
      kind: "duration",
      keyPrefix: "perf",
    },
    {
      regex: /(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:k|m|b|\+)?\s*(?:users|customers|requests|rps|qps|endpoints|services|engineers|students|members|colleges|nodes|events))/gi,
      kind: "scale",
      keyPrefix: "scale",
    },
  ];

  for (const { regex, kind, keyPrefix } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const valueText = match[0].trim();
      const lower = valueText.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);

      const numMatch = valueText.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
      const valueNumber = numMatch ? Number(numMatch[0]) : null;
      const unitMatch = match[2] || valueText.replace(/[\d.,\s$€£₹]/g, "").trim() || null;

      results.push({
        factType: "metric",
        factKey: `${keyPrefix}_${results.length + 1}`,
        valueText,
        valueNumber: Number.isFinite(valueNumber) ? valueNumber : null,
        unit: unitMatch,
        metricKind: kind,
      });
    }
  }

  return results;
}

export class ResumeProvenanceService {
  static async getResumeProvenance(userId: string, resumeId: string) {
    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) return null;

    const jobId = resume.document.jobId || null;

    const [entries, bullets, facts, rewriteRuns] = await Promise.all([
      db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), isNull(bankEntries.deletedAt))),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), isNull(achievementBullets.deletedAt))),
      db
        .select()
        .from(bulletFacts)
        .where(eq(bulletFacts.userId, userId)),
      jobId
        ? db
            .select()
            .from(aiRuns)
            .where(and(eq(aiRuns.userId, userId), eq(aiRuns.jobId, jobId), eq(aiRuns.taskType, "rewrite")))
            .orderBy(desc(aiRuns.createdAt))
            .limit(3)
        : Promise.resolve([]),
    ]);

    const entryMap = new Map(entries.map((e) => [e.id, e]));
    const factsByBulletId = new Map<string, typeof facts>();
    const factsById: Record<
      string,
      {
        id: string;
        factType: string;
        factKey: string;
        valueText: string;
        unit: string | null;
        metricKind: string | null;
        verificationStatus: string;
      }
    > = {};

    for (const f of facts) {
      factsById[f.id] = {
        id: f.id,
        factType: f.factType,
        factKey: f.factKey,
        valueText: f.valueText,
        unit: f.unit,
        metricKind: f.metricKind,
        verificationStatus: f.verificationStatus,
      };
      if (f.bulletId) {
        const list = factsByBulletId.get(f.bulletId) || [];
        list.push(f);
        factsByBulletId.set(f.bulletId, list);
      }
    }

    const bulletsById: Record<
      string,
      {
        id: string;
        entryId: string;
        entryTitle: string;
        entryType: string;
        organization: string | null;
        text: string;
        verificationStatus: string;
        rowVersion: number;
        facts: Array<{
          id: string;
          factType: string;
          factKey: string;
          valueText: string;
          unit: string | null;
          metricKind: string | null;
          verificationStatus: string;
        }>;
      }
    > = {};

    for (const b of bullets) {
      const parent = entryMap.get(b.entryId);
      const bFacts = factsByBulletId.get(b.id) || [];
      bulletsById[b.id] = {
        id: b.id,
        entryId: b.entryId,
        entryTitle: parent?.title || "Career Vault Entry",
        entryType: parent?.entryType || "experience",
        organization: parent?.organization || null,
        text: b.text,
        verificationStatus: b.verificationStatus,
        rowVersion: b.rowVersion,
        facts: bFacts.map((f) => ({
          id: f.id,
          factType: f.factType,
          factKey: f.factKey,
          valueText: f.valueText,
          unit: f.unit,
          metricKind: f.metricKind,
          verificationStatus: f.verificationStatus,
        })),
      };
    }

    const aiRewritesByBulletId: Record<string, any> = {};
    for (const run of rewriteRuns) {
      const results = ((run.validatorReportJson as any)?.results || []) as any[];
      for (const item of results) {
        if (!item?.bulletId || aiRewritesByBulletId[item.bulletId]) continue;
        if (!item.rewrittenText || item.rewrittenText === item.originalText) continue;
        aiRewritesByBulletId[item.bulletId] = {
          runId: run.id,
          bulletId: item.bulletId,
          originalText: item.originalText,
          rewrittenText: item.rewrittenText,
          diffChunks: item.diffChunks || diffWords(item.originalText || "", item.rewrittenText || ""),
          validatorStatus: item.validatorStatus || "passed",
          validationNotes: item.validationNotes || [],
          sourceBulletIds: item.sourceBulletIds || [item.bulletId],
          sourceFactIds: item.sourceFactIds || [],
          xyzStructure: item.xyzStructure || null,
          suggestedMetricQuestion: item.suggestedMetricQuestion || null,
        };
      }
    }

    return {
      resumeId,
      jobId,
      bulletsById,
      factsById,
      aiRewritesByBulletId,
      entriesSummary: entries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        title: e.title,
        organization: e.organization,
      })),
    };
  }

  static async tailorSingleDraftBullet(
    userId: string,
    resumeId: string,
    input: {
      bulletId: string;
      bulletText: string;
      sourceBulletIds?: string[];
      sectionType?: "experience" | "projects";
      entryTitle?: string;
      organization?: string;
      forceLocal?: boolean;
    }
  ) {
    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) throw new Error("Resume not found");

    const sourceBulletId = input.sourceBulletIds?.[0] || input.bulletId;

    const [[userRecord], jdRows, vaultBulletRows, bulletFactRows] = await Promise.all([
      db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1),
      resume.document.jobId
        ? db
            .select()
            .from(jdAnalyses)
            .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, resume.document.jobId)))
            .limit(1)
        : Promise.resolve([]),
      db
        .select()
        .from(achievementBullets)
        .where(and(eq(achievementBullets.userId, userId), eq(achievementBullets.id, sourceBulletId), isNull(achievementBullets.deletedAt)))
        .limit(1),
      db
        .select()
        .from(bulletFacts)
        .where(and(eq(bulletFacts.userId, userId), eq(bulletFacts.bulletId, sourceBulletId))),
    ]);

    const vaultBullet = vaultBulletRows[0] || null;
    let parentEntry: { id?: string; title: string; organization?: string | null; descriptionContext?: string | null } = {
      title: input.entryTitle || "Role",
      organization: input.organization || null,
    };

    if (vaultBullet) {
      const [entry] = await db
        .select()
        .from(bankEntries)
        .where(and(eq(bankEntries.userId, userId), eq(bankEntries.id, vaultBullet.entryId)))
        .limit(1);
      if (entry) {
        parentEntry = {
          id: entry.id,
          title: entry.title,
          organization: entry.organization,
          descriptionContext: entry.descriptionContext,
        };
      }
    }

    const jdAnalysis = (jdRows[0]?.analysisJson as unknown as JDAnalysis | undefined) || undefined;
    const targetKeywords = (jdAnalysis?.keywords || []).slice(0, 8).map((k) => k.canonical);

    const mappedFacts: StructuredFact[] = bulletFactRows.map((f) => f as unknown as StructuredFact);

    const sourceText = vaultBullet?.text || input.bulletText;
    const rewrite = await XyzRewriterService.rewriteBullet(
      {
        id: vaultBullet?.id || input.bulletId,
        text: sourceText,
        facts: mappedFacts,
      },
      parentEntry,
      mappedFacts,
      targetKeywords,
      {
        userEmail: userRecord?.email || null,
        forceLocal: input.forceLocal,
      }
    );

    return {
      bulletId: input.bulletId,
      originalText: input.bulletText,
      vaultOriginalText: sourceText,
      rewrittenText: rewrite.rewrittenText,
      diffChunks: diffWords(input.bulletText, rewrite.rewrittenText),
      validatorStatus: rewrite.passedValidation ? "passed" : "fallback_to_source",
      validationNotes: rewrite.validationNotes,
      xyzStructure: rewrite.xyzStructure,
      suggestedMetricQuestion: rewrite.suggestedMetricQuestion,
      sourceBulletIds: vaultBullet ? [vaultBullet.id] : [],
      sourceFactIds: mappedFacts.map((f) => f.id),
      citedEntry: parentEntry,
      citedFacts: bulletFactRows.map((f) => ({
        id: f.id,
        factType: f.factType,
        factKey: f.factKey,
        valueText: f.valueText,
        unit: f.unit,
        metricKind: f.metricKind,
      })),
    };
  }

  static async syncDraftBulletToVault(
    userId: string,
    resumeId: string,
    input: {
      bulletId: string;
      text: string;
      sourceBulletIds?: string[];
      sectionType: "experience" | "projects";
      entryTitle?: string;
      organization?: string;
      location?: string;
      startDate?: string;
      endDate?: string | null;
      isCurrent?: boolean;
    }
  ) {
    const resume = await ResumeService.getResume(userId, resumeId);
    if (!resume) throw new Error("Resume not found");

    const cleanText = input.text.trim();
    if (!cleanText) throw new Error("Bullet text cannot be empty");

    const extractedFacts = extractMetricFactsFromText(cleanText);
    const candidateBulletId = input.sourceBulletIds?.[0];

    // Path 1: Update linked Career Vault bullet in place
    if (candidateBulletId) {
      const [existingBullet] = await db
        .select()
        .from(achievementBullets)
        .where(
          and(
            eq(achievementBullets.userId, userId),
            eq(achievementBullets.id, candidateBulletId),
            isNull(achievementBullets.deletedAt)
          )
        )
        .limit(1);

      if (existingBullet) {
        await db.transaction(async (tx) => {
          await tx
            .update(achievementBullets)
            .set({
              text: cleanText,
              normalizedText: cleanText.toLowerCase(),
              verificationStatus: "user_verified",
              rowVersion: existingBullet.rowVersion + 1,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(achievementBullets.userId, userId),
                eq(achievementBullets.id, existingBullet.id)
              )
            );

          if (extractedFacts.length > 0) {
            const existingFacts = await tx
              .select({ valueText: bulletFacts.valueText })
              .from(bulletFacts)
              .where(and(eq(bulletFacts.userId, userId), eq(bulletFacts.bulletId, existingBullet.id)));

            const existingSet = new Set(existingFacts.map((f) => f.valueText.toLowerCase()));
            const newFacts = extractedFacts.filter((f) => !existingSet.has(f.valueText.toLowerCase()));

            if (newFacts.length > 0) {
              await tx.insert(bulletFacts).values(
                newFacts.map((f) => ({
                  id: `fact_${crypto.randomUUID()}`,
                  userId,
                  bulletId: existingBullet.id,
                  entryId: existingBullet.entryId,
                  factType: f.factType,
                  factKey: f.factKey,
                  valueText: f.valueText,
                  valueNumber: f.valueNumber,
                  unit: f.unit,
                  metricKind: f.metricKind,
                  verificationStatus: "user_verified",
                }))
              );
            }
          }
        });

        return {
          synced: true,
          action: "updated" as const,
          vaultEntryId: existingBullet.entryId,
          vaultBulletId: existingBullet.id,
          bulletText: cleanText,
          extractedFactsCount: extractedFacts.length,
        };
      }
    }

    // Path 2: Unlinked manual bullet — match existing parent bank entry or create one
    const targetEntryType = input.sectionType === "projects" ? "project" : "experience";
    const userEntries = await db
      .select()
      .from(bankEntries)
      .where(
        and(
          eq(bankEntries.userId, userId),
          eq(bankEntries.entryType, targetEntryType),
          isNull(bankEntries.deletedAt)
        )
      );

    const targetTitleLower = (input.entryTitle || "").trim().toLowerCase();
    const targetOrgLower = (input.organization || "").trim().toLowerCase();

    let matchedEntry = userEntries.find((e) => {
      const titleMatch = targetTitleLower && e.title.trim().toLowerCase() === targetTitleLower;
      const orgMatch = !targetOrgLower || (e.organization || "").trim().toLowerCase() === targetOrgLower;
      return titleMatch && orgMatch;
    });

    if (!matchedEntry && targetTitleLower) {
      matchedEntry = userEntries.find((e) => e.title.trim().toLowerCase() === targetTitleLower);
    }

    let vaultEntryId = matchedEntry?.id;
    if (!vaultEntryId) {
      vaultEntryId = await BankRepository.createEntry(userId, {
        entryType: targetEntryType,
        title: input.entryTitle?.trim() || (targetEntryType === "project" ? "Draft Project" : "Experience Role"),
        organization: input.organization?.trim() || null,
        location: input.location?.trim() || null,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        isCurrent: Boolean(input.isCurrent),
        visibility: "resume",
        verificationStatus: "user_verified",
      });
    }

    const vaultBulletId = await BankRepository.createBullet(userId, vaultEntryId, {
      text: cleanText,
      visibility: "resume",
      verificationStatus: "user_verified",
      usagePolicy: "eligible",
      facts: extractedFacts,
    });

    return {
      synced: true,
      action: "created" as const,
      vaultEntryId,
      vaultBulletId,
      bulletText: cleanText,
      extractedFactsCount: extractedFacts.length,
    };
  }
}
