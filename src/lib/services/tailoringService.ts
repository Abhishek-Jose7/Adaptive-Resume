import { db } from "../db/client";
import { aiRuns, jobs, jdAnalyses, bankEntries, achievementBullets, bulletFacts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ProviderFactory } from "../ai/providerFactory";
import { BulletRetriever } from "../tailoring/bulletRetriever";
import { TruthBoundValidator } from "../tailoring/truthBoundValidator";
import { ExperienceIsolationEngine } from "../tailoring/experienceIsolation";
import { UsageLimitService } from "./usageLimitService";
import { JDAnalysis, RewrittenBullet } from "@/types/job";
import { BankEntry, AchievementBullet, StructuredFact } from "@/types/bank";
import { diffWords } from "diff";

import { XyzRewriterService } from "../ai/services/xyzRewriterService";
import { CanaryDetector } from "../intelligence/canaryDetector";

export interface DiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface TailoredBulletResult {
  bulletId: string;
  originalText: string;
  rewrittenText: string;
  sourceBulletIds: string[];
  sourceFactIds: string[];
  claimMap: any[];
  validatorStatus: "passed" | "rejected" | "fallback_to_source";
  validationNotes: string[];
  retryCount: number;
  status: "pending" | "accepted" | "rejected";
  diffHtml?: string;
  diffChunks?: DiffChunk[];
  suggestedMetricQuestion?: string | null;
  xyzStructure?: {
    accomplishedX: string;
    measuredByY: string | null;
    byDoingZ: string;
  } | null;
}

export interface AiRunDetails {
  id: string;
  userId: string;
  jobId: string;
  provider: string;
  model: string;
  promptVersion: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
  results: TailoredBulletResult[];
}

export class TailoringService {
  /**
   * Orchestrates the complete truth-bound AI tailoring pipeline
   * PRD Section 10.1 - 10.4
   */
  static async tailorJob(
    userId: string,
    jobId: string,
    providerName?: string,
    apiKey?: string,
    options?: {
      mode?: "full_resume" | "single_section" | "single_bullet";
      targetBulletId?: string;
      targetSectionType?: string;
      pinnedBulletIds?: string[];
    }
  ): Promise<AiRunDetails> {
    // 1. Fetch Job and JD Analysis
    const jobList = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1);

    if (jobList.length === 0) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const jdList = await db
      .select()
      .from(jdAnalyses)
      .where(and(eq(jdAnalyses.userId, userId), eq(jdAnalyses.jobId, jobId)))
      .limit(1);

    if (jdList.length === 0) {
      throw new Error(`JD Analysis not found for job: ${jobId}. Run analysis first.`);
    }

    const jdAnalysis = jdList[0].analysisJson as unknown as JDAnalysis;

    // Upfront Atomic Quota Gate (Fail fast & atomically reserve slot before any LLM execution)
    const reservation = await UsageLimitService.checkAndReserveAiGeneration(userId);
    if (!reservation.reserved) {
      throw new Error(
        `QUOTA_EXHAUSTED: Monthly free tier AI tailoring quota of 50 generations reached. Add a personal Gemini or Groq key in Settings for unlimited generations.`
      );
    }

    try {
      // 2. Fetch User Bank Entries, Bullets and Facts
    const userEntries = await db
      .select()
      .from(bankEntries)
      .where(eq(bankEntries.userId, userId));

    const userBullets = await db
      .select()
      .from(achievementBullets)
      .where(eq(achievementBullets.userId, userId));

    const userFacts = await db
      .select()
      .from(bulletFacts)
      .where(eq(bulletFacts.userId, userId));

    // Assemble hierarchical entries
    const factsByBullet = new Map<string, StructuredFact[]>();
    for (const f of userFacts) {
      if (f.bulletId) {
        const list = factsByBullet.get(f.bulletId) || [];
        list.push(f as unknown as StructuredFact);
        factsByBullet.set(f.bulletId, list);
      }
    }

    const bulletsByEntry = new Map<string, AchievementBullet[]>();
    for (const b of userBullets) {
      const bObj: AchievementBullet = {
        ...(b as unknown as AchievementBullet),
        facts: factsByBullet.get(b.id) || [],
      };
      const list = bulletsByEntry.get(b.entryId) || [];
      list.push(bObj);
      bulletsByEntry.set(b.entryId, list);
    }

    const fullEntries: BankEntry[] = userEntries.map((e) => ({
      ...(e as unknown as BankEntry),
      bullets: bulletsByEntry.get(e.id) || [],
    }));

    // 3. Candidate Retrieval & Budgeting (Section 10.3)
    const retrieval = BulletRetriever.retrieveCandidates(fullEntries, jdAnalysis);
    let candidates = retrieval.candidates;

    // Filter by mode (PRD Section 10 & T1)
    if (options?.mode === "single_bullet" && options?.targetBulletId) {
      candidates = candidates.filter((c) => c.bullet.id === options.targetBulletId);
      if (candidates.length === 0) {
        for (const ent of fullEntries) {
          const b = (ent.bullets || []).find((bul) => bul.id === options.targetBulletId);
          if (b) {
            candidates = [{
              bullet: b,
              parentEntry: ent,
              facts: b.facts || [],
              scoreBreakdown: {
                bulletId: b.id,
                totalScore: 50,
                mustHaveScore: 15,
                responsibilityScore: 10,
                outcomeScore: 10,
                domainScore: 5,
                recencyScore: 5,
                seniorityScore: 5,
                importanceScore: 0,
                matchedKeywords: jdAnalysis.keywords.slice(0, 5).map((k) => k.canonical),
                isExcluded: false,
              },
            }];
            break;
          }
        }
      }
    } else if (options?.mode === "single_section" && options?.targetSectionType) {
      candidates = candidates.filter((c) => c.parentEntry.entryType === options.targetSectionType);
    }

    const provider = ProviderFactory.getProvider(providerName, apiKey, "reasoning");
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    const tailoredResults: TailoredBulletResult[] = [];

    // Run Canary Trap Detection on target job raw text
    const canaryScan = CanaryDetector.detectCanaryTraps(jobList[0].rawText || "");
    const quarantinedKeywords = canaryScan.quarantinedKeywords;
    const allJdKeywords = (jdAnalysis.keywords || []).map((k) => k.canonical);

    // System prompt enforcing Section 10.4 truth-grounded rules & Google XYZ methodology
    const systemPrompt = `You are a Truth-Bound Resume Tailoring Assistant implementing Google's XYZ Achievement-Writing Methodology:
"Accomplished [X], as measured by [Y], by doing [Z]"

CRITICAL INTEGRITY AND WRITING RULES:
1. Every factual claim MUST be explicitly entailed by the provided source bullet and structured facts.
2. NEVER invent, extrapolate, or hallucinate metrics, percentages, tools, employers, or outcomes.
3. If verified metrics exist in the source bullet or facts, format with measurable evidence [Y].
4. If metric [Y] is unavailable in source evidence:
   - Produce the strongest honest, concise bullet without any fabricated numbers.
   - You may suggest a metric question in "suggestedMetricQuestion" for user confirmation, NOT as bullet content.
5. Do NOT promote scope (e.g. do not turn "assisted" or "contributed" into "led", "architected", or "owned").
6. RECRUITER HONEY-POT & CANARY TRAP PROTECTION:
   Recruiters intentionally plant fake skills and trap technologies (e.g. "Cribbage programming language", made-up frameworks/databases) to catch and auto-reject AI resumes.
   - NEVER adopt, mirror, or insert ANY technology, language, library, or tool from the job description unless that exact tool is explicitly evidenced in the candidate's provided source bullet or verified facts.
   - If the job description requires a tool the candidate has not used, completely omit it. Never claim familiarity.
7. Return a structured JSON object matching RewrittenBullet:
   - text: string (concise, active achievement bullet)
   - sourceBulletIds: string[]
   - sourceFactIds: string[]
   - claimMap: Array<{ claim: string; evidenceIds: string[]; claimType: "action" | "tool" | "metric" | "scope" | "outcome" | "date" | "other" }>
   - suggestedMetricQuestion?: string | null
   - xyzStructure?: { accomplishedX: string; measuredByY: string | null; byDoingZ: string } | null`;

    const allCandidateBullets = candidates.map((c) => c.bullet);
    const allCandidateFacts = userFacts as unknown as StructuredFact[];

    // 4. Tailor each candidate bullet
    for (const item of candidates) {
      const sourceBullet = item.bullet;
      const relevantKeywords = item.scoreBreakdown.matchedKeywords;

      // Check if bullet is pinned (PRD Section 10.4 & T9)
      const isPinned = options?.pinnedBulletIds?.includes(sourceBullet.id);
      if (isPinned) {
        tailoredResults.push({
          bulletId: sourceBullet.id,
          originalText: sourceBullet.text,
          rewrittenText: sourceBullet.text,
          sourceBulletIds: [sourceBullet.id],
          sourceFactIds: (sourceBullet.facts || []).map((f) => f.id),
          claimMap: [{ claim: sourceBullet.text, evidenceIds: [sourceBullet.id], claimType: "action" }],
          validatorStatus: "passed",
          validationNotes: ["Preserved: bullet is pinned by candidate (PRD Section 10.4 & T9)"],
          retryCount: 0,
          status: "accepted",
          diffChunks: [{ value: sourceBullet.text }],
        });
        continue;
      }

      const userPayload = {
        sourceBullet,
        parentEntry: {
          title: item.parentEntry.title,
          organization: item.parentEntry.organization,
          descriptionContext: item.parentEntry.descriptionContext,
        },
        facts: item.facts,
        jdTarget: {
          title: jdAnalysis.role.title,
          targetKeywords: relevantKeywords,
        },
      };

      let attempt = 0;
      let finalResult: TailoredBulletResult | null = null;
      let promptFeedback = "";

      while (attempt <= 1) {
        attempt++;
        const llmInput = {
          task: "rewrite" as const,
          systemPrompt: promptFeedback
            ? `${systemPrompt}\n\nPREVIOUS ATTEMPT FAILED TRUTH VALIDATION: ${promptFeedback}\nFix the violation immediately or keep the original phrasing.`
            : systemPrompt,
          userPayload,
          schema: {},
          maxOutputTokens: 256,
          temperature: 0.1,
        };

        const res = await provider.generateStructured<RewrittenBullet>(llmInput);
        if (res.usage) {
          totalTokensIn += res.usage.promptTokens;
          totalTokensOut += res.usage.completionTokens;
        }

        const candidateRewrite = res.data;

        // Scope evidence strictly to the target entry being tailored (Experience Isolation & Truth Scoping)
        const targetEntryBullets = allCandidateBullets.filter((b) => b.entryId === item.parentEntry.id);
        const targetBulletIds = new Set(targetEntryBullets.map((b) => b.id));
        const targetEntryFacts = allCandidateFacts.filter(
          (f: any) => f.entryId === item.parentEntry.id || (f.bulletId && targetBulletIds.has(f.bulletId))
        );
        const targetEntries = fullEntries.filter((e) => e.id === item.parentEntry.id);

        // Run Deterministic Truth-Bound Validation scoped strictly to target entry with Canary Shield
        const validation = TruthBoundValidator.validate(
          candidateRewrite,
          targetEntryBullets,
          targetEntryFacts,
          targetEntries,
          item.parentEntry.id,
          {
            quarantinedKeywords,
            targetKeywords: relevantKeywords.length > 0 ? relevantKeywords : allJdKeywords,
          }
        );

        // Run Experience Isolation Audit (Section 18.2)
        const isolationCheck = ExperienceIsolationEngine.auditIsolation(
          candidateRewrite.text,
          item.parentEntry.id,
          fullEntries,
          allCandidateBullets,
          allCandidateFacts as any
        );

        if (!isolationCheck.isIsolated) {
          validation.isValid = false;
          validation.failures.push({
            rule: "UNGROUNDED_SCOPE",
            message: isolationCheck.violationMessage || "Experience isolation violation",
          });
          validation.feedbackForRetry = isolationCheck.violationMessage;
        }

        if (validation.isValid) {
          // Compute diff
          const diff = diffWords(sourceBullet.text, candidateRewrite.text);
          const diffChunks: DiffChunk[] = diff.map((part) => ({
            value: part.value,
            added: Boolean(part.added),
            removed: Boolean(part.removed),
          }));
          const diffHtml = diff
            .map((part) => {
              const escaped = escapeHtml(part.value);
              if (part.added) return `<ins class="bg-press text-press">${escaped}</ins>`;
              if (part.removed) return `<del class="bg-alarm text-alarm line-through">${escaped}</del>`;
              return escaped;
            })
            .join("");

          finalResult = {
            bulletId: sourceBullet.id,
            originalText: sourceBullet.text,
            rewrittenText: candidateRewrite.text,
            sourceBulletIds: candidateRewrite.sourceBulletIds,
            sourceFactIds: candidateRewrite.sourceFactIds,
            claimMap: candidateRewrite.claimMap,
            validatorStatus: "passed",
            validationNotes: ["Passed all truth-bound validation checks."],
            retryCount: attempt - 1,
            status: "pending",
            diffHtml,
            diffChunks,
            suggestedMetricQuestion:
              candidateRewrite.suggestedMetricQuestion ||
              (sourceBullet.facts && sourceBullet.facts.length > 0
                ? null
                : XyzRewriterService.generateMetricQuestion(sourceBullet.text)),
            xyzStructure: candidateRewrite.xyzStructure || {
              accomplishedX: candidateRewrite.text,
              measuredByY: null,
              byDoingZ: "Targeted implementation",
            },
          };
          break;
        } else {
          // If 1st attempt failed, set feedback and retry
          if (attempt === 1) {
            promptFeedback = validation.feedbackForRetry || "Validation failed";
          } else {
            // Second attempt failed: Mandatory conservative fallback to source bullet (PRD 10.4 Rule 9)
            finalResult = {
              bulletId: sourceBullet.id,
              originalText: sourceBullet.text,
              rewrittenText: sourceBullet.text,
              sourceBulletIds: [sourceBullet.id],
              sourceFactIds: (sourceBullet.facts || []).map((f) => f.id),
              claimMap: [
                {
                  claim: sourceBullet.text,
                  evidenceIds: [sourceBullet.id],
                  claimType: "action",
                },
              ],
              validatorStatus: "fallback_to_source",
              validationNotes: [
                `AI rewrite rejected: ${validation.feedbackForRetry}`,
                "Fell back to verified source bullet to guarantee zero hallucination.",
              ],
              retryCount: attempt - 1,
              status: "pending",
              diffHtml: escapeHtml(sourceBullet.text),
              diffChunks: [{ value: sourceBullet.text }],
              suggestedMetricQuestion: XyzRewriterService.generateMetricQuestion(sourceBullet.text),
              xyzStructure: null,
            };
          }
        }
      }

      if (finalResult) {
        tailoredResults.push(finalResult);
      }
    }

    // 5. Store AI Run Record
    const runId = crypto.randomUUID();
    const newRun = {
      id: runId,
      userId,
      taskType: "rewrite",
      jobId,
      resumeVersionId: null,
      provider: provider.name,
      model: "v1-truth-bound",
      promptVersion: "v1.0",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      validatorReportJson: { results: tailoredResults } as any,
    };

      await db.insert(aiRuns).values(newRun);
      await UsageLimitService.recordAiTokens(userId, totalTokensIn + totalTokensOut);

      return {
        id: runId,
        userId,
        jobId,
        provider: provider.name,
        model: "v1-truth-bound",
        promptVersion: "v1.0",
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        createdAt: new Date().toISOString(),
        results: tailoredResults,
      };
    } catch (err) {
      if (!reservation.isByok) {
        await UsageLimitService.refundAiGeneration(userId);
      }
      throw err;
    }
  }

  /**
   * Retrieves an AI Run by ID
   */
  static async getRun(userId: string, runId: string): Promise<AiRunDetails | null> {
    const list = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.userId, userId), eq(aiRuns.id, runId)))
      .limit(1);

    if (list.length === 0) return null;
    const r = list[0];
    const report = r.validatorReportJson as any;

    return {
      id: r.id,
      userId: r.userId,
      jobId: r.jobId || "",
      provider: r.provider,
      model: r.model,
      promptVersion: r.promptVersion,
      tokensIn: r.tokensIn || 0,
      tokensOut: r.tokensOut || 0,
      createdAt: r.createdAt.toISOString(),
      results: report?.results || [],
    };
  }

  /**
   * Accepts or rejects an individual tailored bullet
   */
  static async updateItemStatus(
    userId: string,
    runId: string,
    bulletId: string,
    status: "accepted" | "rejected"
  ): Promise<AiRunDetails> {
    const run = await this.getRun(userId, runId);
    if (!run) throw new Error("AI run not found");

    const updatedResults = run.results.map((item) => {
      if (item.bulletId === bulletId) {
        return { ...item, status };
      }
      return item;
    });

    await db
      .update(aiRuns)
      .set({
        validatorReportJson: { results: updatedResults } as any,
      })
      .where(and(eq(aiRuns.userId, userId), eq(aiRuns.id, runId)));

    return {
      ...run,
      results: updatedResults,
    };
  }
}
